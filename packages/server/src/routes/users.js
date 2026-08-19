import path from 'path';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { authMiddleware } from '../auth.js';
import { assertAdmin } from '../lib/admin.js';
import { avatarUpload, UPLOAD_DIR } from '../upload.js';

export const usersRouter = Router();

usersRouter.use(authMiddleware);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BULK_MAX = 500;

/**
 * Resolve company + department by name. Creates missing rows.
 * Cache key: `${companyName}::${departmentName}` (lowercase).
 */
async function resolveDepartmentId(companyName, departmentName, cache) {
  const key = `${companyName.toLowerCase()}::${departmentName.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key);

  let company = await prisma.company.findFirst({
    where: { name: { equals: companyName, mode: 'insensitive' } },
  });
  if (!company) {
    company = await prisma.company.create({ data: { name: companyName } });
  }

  let department = await prisma.department.findFirst({
    where: {
      companyId: company.id,
      name: { equals: departmentName, mode: 'insensitive' },
    },
  });
  if (!department) {
    department = await prisma.department.create({
      data: { name: departmentName, companyId: company.id },
    });
  }

  cache.set(key, department.id);
  return department.id;
}

/**
 * POST /users/bulk — admin only bulk user registration.
 * Body: { defaultPassword?: string, users: [{ email, name, password?, phone?, jobTitle?, departmentName?, companyName? }] }
 * Partial success: created[] + failed[].
 */
usersRouter.post('/bulk', async (req, res) => {
  try {
    if (!(await assertAdmin(req, res))) return;

    const users = Array.isArray(req.body?.users) ? req.body.users : null;
    if (!users || users.length === 0) {
      return res.status(400).json({ error: 'users array is required' });
    }
    if (users.length > BULK_MAX) {
      return res.status(400).json({ error: `users must be at most ${BULK_MAX}` });
    }

    const defaultPassword =
      typeof req.body.defaultPassword === 'string' ? req.body.defaultPassword : '';

    const deptCache = new Map();
    const created = [];
    const failed = [];
    const seenEmails = new Set();

    for (let i = 0; i < users.length; i++) {
      const row = i + 1;
      const item = users[i] && typeof users[i] === 'object' ? users[i] : {};
      const email = typeof item.email === 'string' ? item.email.trim().toLowerCase() : '';
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      const password =
        typeof item.password === 'string' && item.password
          ? item.password
          : defaultPassword;
      const phone =
        typeof item.phone === 'string' && item.phone.trim()
          ? item.phone.trim().slice(0, 50)
          : null;
      const jobTitle =
        typeof item.jobTitle === 'string' && item.jobTitle.trim()
          ? item.jobTitle.trim().slice(0, 30)
          : null;
      const departmentName =
        typeof item.departmentName === 'string' ? item.departmentName.trim() : '';
      const companyName =
        typeof item.companyName === 'string' ? item.companyName.trim() : '';

      if (!email || !EMAIL_RE.test(email)) {
        failed.push({ row, email: email || null, reason: 'INVALID_EMAIL' });
        continue;
      }
      if (!name) {
        failed.push({ row, email, reason: 'NAME_REQUIRED' });
        continue;
      }
      if (!password || password.length < 4) {
        failed.push({ row, email, reason: 'PASSWORD_REQUIRED' });
        continue;
      }
      if (seenEmails.has(email)) {
        failed.push({ row, email, reason: 'DUPLICATE_IN_BATCH' });
        continue;
      }
      seenEmails.add(email);

      if ((departmentName && !companyName) || (!departmentName && companyName)) {
        failed.push({ row, email, reason: 'COMPANY_AND_DEPARTMENT_REQUIRED' });
        continue;
      }

      try {
        const existing = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        if (existing) {
          failed.push({ row, email, reason: 'EMAIL_EXISTS' });
          continue;
        }

        let departmentId = null;
        if (companyName && departmentName) {
          departmentId = await resolveDepartmentId(companyName, departmentName, deptCache);
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
          data: {
            email,
            name,
            password: hashed,
            phone,
            jobTitle,
            departmentId,
          },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            jobTitle: true,
            departmentId: true,
            createdAt: true,
          },
        });
        created.push(user);
      } catch (err) {
        if (err?.code === 'P2002') {
          failed.push({ row, email, reason: 'EMAIL_EXISTS' });
        } else {
          console.error(`[users/bulk] row ${row}:`, err);
          failed.push({ row, email, reason: 'CREATE_FAILED' });
        }
      }
    }

    return res.status(201).json({
      created: created.length,
      failed: failed.length,
      users: created,
      errors: failed,
    });
  } catch (err) {
    console.error('[users/bulk]', err);
    return res.status(500).json({ error: 'Bulk registration failed' });
  }
});

usersRouter.get('/', async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const where = { id: { not: req.userId } };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    const users = await prisma.user.findMany({
      where,
      select: { id: true, email: true, name: true, phone: true, jobTitle: true, statusMessage: true, avatarUrl: true, updatedAt: true },
      orderBy: { name: 'asc' },
      take: limit,
    });
    const result = users.map((u) => {
      const ver = u.updatedAt ? `?v=${new Date(u.updatedAt).getTime()}` : '';
      return { ...u, avatarUrl: u.avatarUrl ? `/users/${u.id}/avatar${ver}` : null };
    });
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

usersRouter.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, name: true, phone: true, jobTitle: true, statusMessage: true, avatarUrl: true, updatedAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const avatarVer = user.updatedAt ? `?v=${new Date(user.updatedAt).getTime()}` : '';
    return res.json({ ...user, avatarUrl: user.avatarUrl ? `/users/${user.id}/avatar${avatarVer}` : null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Delete my avatar
usersRouter.delete('/me/avatar', async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: { avatarUrl: null },
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete avatar' });
  }
});

// Upload my avatar - must be before /:id to avoid conflict
usersRouter.post('/me/avatar', avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '이미지 파일을 선택해주세요' });
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: { avatarUrl: req.file.filename },
      select: { updatedAt: true },
    });
    const ver = updated.updatedAt ? `?v=${new Date(updated.updatedAt).getTime()}` : '';
    return res.json({ avatarUrl: `/users/${req.userId}/avatar${ver}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Get user avatar image
usersRouter.get('/:id/avatar', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { avatarUrl: true },
    });
    if (!user?.avatarUrl) return res.status(404).json({ error: 'Avatar not found' });
    const filePath = path.resolve(UPLOAD_DIR, user.avatarUrl);
    return res.sendFile(filePath, { maxAge: 86400 }, (err) => {
      if (err && !res.headersSent) res.status(404).json({ error: 'Avatar not found' });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch avatar' });
  }
});

// Register / update push device token
usersRouter.post('/me/device-token', async (req, res) => {
  try {
    const { token, platform } = req.body;
    if (!token || !platform) {
      return res.status(400).json({ error: 'token and platform are required' });
    }
    const allowed = ['ios', 'android', 'web'];
    if (!allowed.includes(platform)) {
      return res.status(400).json({ error: `platform must be one of: ${allowed.join(', ')}` });
    }
    await prisma.deviceToken.upsert({
      where: { userId_token: { userId: req.userId, token } },
      create: { userId: req.userId, token, platform },
      update: { platform, updatedAt: new Date() },
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save device token' });
  }
});

// Remove device token (logout / unregister)
usersRouter.delete('/me/device-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token is required' });
    await prisma.deviceToken.deleteMany({
      where: { userId: req.userId, token },
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete device token' });
  }
});

// Update my profile (phone, jobTitle, statusMessage)
usersRouter.put('/me', async (req, res) => {
  try {
    const { phone, jobTitle, statusMessage } = req.body;
    const data = {};
    if (phone !== undefined) data.phone = phone && String(phone).trim() ? String(phone).trim().slice(0, 50) : null;
    if (jobTitle !== undefined) data.jobTitle = jobTitle && String(jobTitle).trim() ? String(jobTitle).trim().slice(0, 30) : null;
    if (statusMessage !== undefined) data.statusMessage = statusMessage && String(statusMessage).trim() ? String(statusMessage).trim().slice(0, 200) : null;
    if (Object.keys(data).length === 0) return res.json({ ok: true });
    await prisma.user.update({
      where: { id: req.userId },
      data,
    });
    const io = req.app.get('io');
    if (io && (data.statusMessage !== undefined)) {
      io.emit('user_status_changed', { userId: req.userId, statusMessage: data.statusMessage ?? null });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[users/me PUT]', err);
    const msg = err?.message || 'Failed to update profile';
    return res.status(500).json({ error: msg });
  }
});

// Update status message
usersRouter.put('/status', async (req, res) => {
  try {
    const { statusMessage } = req.body;
    await prisma.user.update({
      where: { id: req.userId },
      data: { statusMessage: statusMessage || null },
    });
    const io = req.app.get('io');
    if (io) {
      io.emit('user_status_changed', { userId: req.userId, statusMessage: statusMessage || null });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update status' });
  }
});
