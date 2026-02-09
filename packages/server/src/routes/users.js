import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../auth.js';

export const usersRouter = Router();

usersRouter.use(authMiddleware);

usersRouter.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { id: { not: req.userId } },
      select: { id: true, email: true, name: true, statusMessage: true },
      orderBy: { name: 'asc' },
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
      select: { id: true, email: true, name: true, statusMessage: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch user' });
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
