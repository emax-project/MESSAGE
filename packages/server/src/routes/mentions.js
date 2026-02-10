import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../auth.js';

export const mentionsRouter = Router();

mentionsRouter.use(authMiddleware);

// List my mentions (with message + room info)
mentionsRouter.get('/', async (req, res) => {
  try {
    const mentions = await prisma.mention.findMany({
      where: { userId: req.userId },
      orderBy: { message: { createdAt: 'desc' } },
      take: 100,
      include: {
        message: {
          include: {
            sender: { select: { id: true, name: true } },
            room: {
              select: {
                id: true,
                name: true,
                isGroup: true,
                members: {
                  where: { leftAt: null },
                  select: { user: { select: { id: true, name: true } } },
                },
              },
            },
          },
        },
      },
    });

    const result = mentions.map((m) => {
      const room = m.message.room;
      const otherMembers = room.members.filter((mb) => mb.user.id !== req.userId);
      const roomName = room.name || otherMembers.map((mb) => mb.user.name).join(', ') || '채팅방';
      return {
        id: m.id,
        messageId: m.messageId,
        readAt: m.readAt,
        message: {
          id: m.message.id,
          content: m.message.deletedAt ? '[삭제된 메시지]' : m.message.content,
          createdAt: m.message.createdAt,
          sender: m.message.sender,
          room: { id: room.id, name: roomName },
        },
      };
    });

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch mentions' });
  }
});

// Mark mention as read
mentionsRouter.post('/:id/read', async (req, res) => {
  try {
    const mention = await prisma.mention.findUnique({ where: { id: req.params.id } });
    if (!mention || mention.userId !== req.userId) {
      return res.status(404).json({ error: 'Mention not found' });
    }

    await prisma.mention.update({
      where: { id: req.params.id },
      data: { readAt: new Date() },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to mark mention as read' });
  }
});

// Get unread mention count
mentionsRouter.get('/unread-count', async (req, res) => {
  try {
    const count = await prisma.mention.count({
      where: { userId: req.userId, readAt: null },
    });
    return res.json({ count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to get unread count' });
  }
});
