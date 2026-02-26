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
      select: { id: true, email: true, name: true, statusMessage: true },
      orderBy: { name: 'asc' },
      take: limit,
    });
    return res.json(users);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

usersRouter.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, name: true, statusMessage: true, avatarUrl: true, updatedAt: true },
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
