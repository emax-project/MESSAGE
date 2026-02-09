import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../auth.js';

export const eventsRouter = Router();
eventsRouter.use(authMiddleware);

/** 내 일정 목록 */
eventsRouter.get('/', async (req, res) => {
  try {
    const list = await prisma.event.findMany({
      where: { userId: req.userId },
      orderBy: { startAt: 'asc' },
    });
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/** 일정 추가 */
eventsRouter.post('/', async (req, res) => {
  try {
    const { title, startAt, endAt, description } = req.body;
    if (!title || !startAt || !endAt) {
      return res.status(400).json({ error: 'title, startAt, endAt required' });
    }
    const normalizedTitle = String(title).trim();
    const normalizedStart = new Date(startAt);
    const normalizedEnd = new Date(endAt);
    const dup = await prisma.event.findFirst({
      where: {
        userId: req.userId,
        title: normalizedTitle,
        startAt: normalizedStart,
        endAt: normalizedEnd,
      },
      select: { id: true },
    });
    if (dup) {
      return res.status(409).json({ error: 'Duplicate event' });
    }
    const event = await prisma.event.create({
      data: {
        userId: req.userId,
        title: normalizedTitle,
        startAt: normalizedStart,
        endAt: normalizedEnd,
        description: description != null ? String(description).trim() || null : null,
      },
    });
    return res.status(201).json(event);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create event' });
  }
});

/** 일정 수정 */
eventsRouter.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.event.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Event not found' });

    const { title, startAt, endAt, description } = req.body;
    const data = {};
    if (title !== undefined) data.title = String(title).trim();
    if (startAt !== undefined) data.startAt = new Date(startAt);
    if (endAt !== undefined) data.endAt = new Date(endAt);
    if (description !== undefined) data.description = description != null ? String(description).trim() || null : null;

    const nextTitle = data.title ?? existing.title;
    const nextStart = data.startAt ?? existing.startAt;
    const nextEnd = data.endAt ?? existing.endAt;
    const dup = await prisma.event.findFirst({
      where: {
        userId: req.userId,
        title: nextTitle,
        startAt: nextStart,
        endAt: nextEnd,
        id: { not: existing.id },
      },
      select: { id: true },
    });
    if (dup) {
      return res.status(409).json({ error: 'Duplicate event' });
    }

    const event = await prisma.event.update({
      where: { id: req.params.id },
      data,
    });
    return res.json(event);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update event' });
  }
});

/** 일정 삭제 */
eventsRouter.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.event.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Event not found' });
    await prisma.event.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete event' });
  }
});
