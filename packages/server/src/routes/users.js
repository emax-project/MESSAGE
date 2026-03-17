import path from 'path';
import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../auth.js';
import { avatarUpload, UPLOAD_DIR } from '../upload.js';

export const usersRouter = Router();

usersRouter.use(authMiddleware);

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
