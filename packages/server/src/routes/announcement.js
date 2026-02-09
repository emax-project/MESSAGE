import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../auth.js';

export const announcementRouter = Router();

/** 공지 내용 조회 (로그인 불필요) */
announcementRouter.get('/', async (_req, res) => {
  try {
    const row = await prisma.announcement.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { content: true },
    });
    return res.json({ content: row?.content ?? null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch announcement' });
  }
});

/** 공지 등록/수정 (관리자만) */
announcementRouter.put('/', authMiddleware, async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || '';
    if (!adminEmail) {
      return res.status(503).json({ error: 'Admin not configured (ADMIN_EMAIL)' });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { email: true },
    });
    if (!user || user.email !== adminEmail) {
      return res.status(403).json({ error: 'Admin only' });
    }
    const { content } = req.body;
    const text = typeof content === 'string' ? content.trim() : '';
    const row = await prisma.announcement.findFirst();
    if (row) {
      await prisma.announcement.update({
        where: { id: row.id },
        data: { content: text || '' },
      });
    } else {
      await prisma.announcement.create({
        data: { content: text || '' },
      });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save announcement' });
  }
});
