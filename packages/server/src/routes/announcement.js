import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../auth.js';

export const announcementRouter = Router();

async function assertAdmin(req, res) {
  const adminEmails = (process.env.ADMIN_EMAIL || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (adminEmails.length === 0) {
    res.status(503).json({ error: 'Admin not configured (ADMIN_EMAIL)' });
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { email: true },
  });
  const userEmail = (user?.email || '').trim().toLowerCase();
  if (!user || !adminEmails.includes(userEmail)) {
    res.status(403).json({ error: 'Admin only' });
    return null;
  }
  return user;
}

const toItem = (row) => ({
  id: row.id,
  title: row.title ?? null,
  content: row.content,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

/** 공지 목록 조회 (로그인 불필요) — 최신순 */
announcementRouter.get('/', async (_req, res) => {
  try {
    const rows = await prisma.announcement.findMany({
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, content: true, createdAt: true, updatedAt: true },
    });
    const items = rows.map(toItem);
    const latest = items[0] ?? null;
    return res.json({
      items,
      content: latest?.content ?? null,
      updatedAt: latest?.updatedAt ?? null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

/** 공지 등록 (관리자만) */
announcementRouter.post('/', authMiddleware, async (req, res) => {
  try {
    if (!(await assertAdmin(req, res))) return;
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    const row = await prisma.announcement.create({
      data: { title: title || null, content },
    });
    return res.status(201).json(toItem(row));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create announcement' });
  }
});

/** 공지 수정 (관리자만) */
announcementRouter.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (!(await assertAdmin(req, res))) return;
    const existing = await prisma.announcement.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : existing.title;
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : existing.content;
    const row = await prisma.announcement.update({
      where: { id: req.params.id },
      data: { title: title || null, content },
    });
    return res.json(toItem(row));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update announcement' });
  }
});

/** @deprecated 단일 공지 수정 — 최신 공지 1건만 갱신 (하위 호환) */
announcementRouter.put('/', authMiddleware, async (req, res) => {
  try {
    if (!(await assertAdmin(req, res))) return;
    const { content } = req.body;
    const text = typeof content === 'string' ? content.trim() : '';
    const row = await prisma.announcement.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (row) {
      const updated = await prisma.announcement.update({
        where: { id: row.id },
        data: { content: text || '' },
      });
      return res.json({ ok: true, item: toItem(updated) });
    }
    const created = await prisma.announcement.create({ data: { content: text || '' } });
    return res.json({ ok: true, item: toItem(created) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save announcement' });
  }
});
