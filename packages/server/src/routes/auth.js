import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { authMiddleware, signToken } from '../auth.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password, name required' });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    await prisma.userSession.deleteMany({ where: { userId: user.id } });
    const session = await prisma.userSession.create({ data: { userId: user.id } });
    const token = signToken({ userId: user.id, sessionId: session.id });
    const adminEmails = (process.env.ADMIN_EMAIL || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    const userEmail = (user.email || '').trim().toLowerCase();
    const userWithAdmin = {
      ...user,
      isAdmin: adminEmails.length > 0 && adminEmails.includes(userEmail),
    };
    return res.status(201).json({ user: userWithAdmin, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    await prisma.userSession.deleteMany({ where: { userId: user.id } });
    const session = await prisma.userSession.create({ data: { userId: user.id } });
    const token = signToken({ userId: user.id, sessionId: session.id });
    const adminEmails = (process.env.ADMIN_EMAIL || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    const userEmail = (user.email || '').trim().toLowerCase();
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        isAdmin: adminEmails.length > 0 && adminEmails.includes(userEmail),
      },
      token,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

authRouter.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user) return res.status(401).json({ error: 'User not found' });
    const adminEmails = (process.env.ADMIN_EMAIL || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    const userEmail = (user.email || '').trim().toLowerCase();
    return res.json({
      user: {
        ...user,
        isAdmin: adminEmails.length > 0 && adminEmails.includes(userEmail),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to get current user' });
  }
});

authRouter.post('/logout', authMiddleware, async (req, res) => {
  try {
    if (req.sessionId) {
      await prisma.userSession.delete({ where: { id: req.sessionId } }).catch(() => {});
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Logout failed' });
  }
});
