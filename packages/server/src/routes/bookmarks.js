import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../auth.js';

export const bookmarksRouter = Router();

bookmarksRouter.use(authMiddleware);

// List my bookmarks (with message + room info)
bookmarksRouter.get('/', async (req, res) => {
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
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

    const result = bookmarks.map((b) => {
      const room = b.message.room;
      const otherMembers = room.members.filter((m) => m.user.id !== req.userId);
      const roomName = room.name || otherMembers.map((m) => m.user.name).join(', ') || '채팅방';
      return {
        id: b.id,
        messageId: b.messageId,
        createdAt: b.createdAt,
        message: {
          id: b.message.id,
          content: b.message.deletedAt ? '[삭제된 메시지]' : b.message.content,
          createdAt: b.message.createdAt,
          sender: b.message.sender,
          fileUrl: b.message.fileUrl,
          fileName: b.message.fileName,
          fileSize: b.message.fileSize != null ? Number(b.message.fileSize) : null,
          room: { id: room.id, name: roomName },
        },
      };
    });

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

// Add bookmark
bookmarksRouter.post('/', async (req, res) => {
  try {
    const { messageId } = req.body;
    if (!messageId) return res.status(400).json({ error: 'messageId required' });

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const member = await prisma.roomMember.findFirst({
      where: { roomId: message.roomId, userId: req.userId },
    });
    if (!member) return res.status(403).json({ error: 'Not a member of this room' });

    const bookmark = await prisma.bookmark.upsert({
      where: { userId_messageId: { userId: req.userId, messageId } },
      create: { userId: req.userId, messageId },
      update: {},
    });

    return res.status(201).json(bookmark);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to add bookmark' });
  }
});

// Remove bookmark
bookmarksRouter.delete('/:messageId', async (req, res) => {
  try {
    await prisma.bookmark.deleteMany({
      where: { userId: req.userId, messageId: req.params.messageId },
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to remove bookmark' });
  }
});
