import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../auth.js';
import { sendPushToUser } from '../push.js';

export const memosRouter = Router();

memosRouter.use(authMiddleware);

const senderSelect = { id: true, name: true, email: true, avatarUrl: true };
const recipientUserSelect = { id: true, name: true, email: true };

function formatMemo(memo, { recipientRow, viewerId }) {
  const isSender = memo.senderId === viewerId;
  const myRecipient = recipientRow ?? memo.recipients?.find((r) => r.userId === viewerId);
  return {
    id: memo.id,
    subject: memo.subject,
    body: memo.body,
    createdAt: memo.createdAt,
    sender: memo.sender,
    recipients: memo.recipients.map((r) => ({
      id: r.id,
      userId: r.userId,
      readAt: r.readAt,
      user: r.user,
    })),
    readAt: isSender ? null : (myRecipient?.readAt ?? null),
    recipientId: myRecipient?.id ?? null,
  };
}

// 받은 쪽지
memosRouter.get('/inbox', async (req, res) => {
  try {
    const rows = await prisma.memoRecipient.findMany({
      where: { userId: req.userId, deletedAt: null },
      orderBy: { memo: { createdAt: 'desc' } },
      take: 100,
      include: {
        memo: {
          include: {
            sender: { select: senderSelect },
            recipients: { include: { user: { select: recipientUserSelect } } },
          },
        },
      },
    });

    return res.json(rows.map((row) => formatMemo(row.memo, { recipientRow: row, viewerId: req.userId })));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

// 보낸 쪽지
memosRouter.get('/sent', async (req, res) => {
  try {
    const memos = await prisma.memo.findMany({
      where: { senderId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        sender: { select: senderSelect },
        recipients: { include: { user: { select: recipientUserSelect } } },
      },
    });

    return res.json(memos.map((m) => formatMemo(m, { viewerId: req.userId })));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch sent memos' });
  }
});

// 읽지 않은 쪽지 수
memosRouter.get('/unread-count', async (req, res) => {
  try {
    const count = await prisma.memoRecipient.count({
      where: { userId: req.userId, readAt: null, deletedAt: null },
    });
    return res.json({ count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// 쪽지 상세
memosRouter.get('/:id', async (req, res) => {
  try {
    const memo = await prisma.memo.findUnique({
      where: { id: req.params.id },
      include: {
        sender: { select: senderSelect },
        recipients: { include: { user: { select: recipientUserSelect } } },
      },
    });
    if (!memo) return res.status(404).json({ error: 'Memo not found' });

    const isSender = memo.senderId === req.userId;
    const isRecipient = memo.recipients.some((r) => r.userId === req.userId && !r.deletedAt);
    if (!isSender && !isRecipient) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json(formatMemo(memo, { viewerId: req.userId }));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch memo' });
  }
});

// 쪽지 발송
memosRouter.post('/', async (req, res) => {
  try {
    const { recipientIds, subject, body } = req.body;
    const trimmedSubject = String(subject ?? '').trim();
    const trimmedBody = String(body ?? '').trim();
    if (!trimmedSubject) return res.status(400).json({ error: 'subject is required' });
    if (!trimmedBody) return res.status(400).json({ error: 'body is required' });

    const ids = [...new Set((Array.isArray(recipientIds) ? recipientIds : []).map(String))].filter(
      (id) => id && id !== req.userId,
    );
    if (ids.length === 0) {
      return res.status(400).json({ error: 'At least one recipient is required' });
    }

    const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true } });
    if (users.length !== ids.length) {
      return res.status(400).json({ error: 'Invalid recipient' });
    }

    const memo = await prisma.memo.create({
      data: {
        senderId: req.userId,
        subject: trimmedSubject,
        body: trimmedBody,
        recipients: {
          create: ids.map((userId) => ({ userId })),
        },
      },
      include: {
        sender: { select: senderSelect },
        recipients: { include: { user: { select: recipientUserSelect } } },
      },
    });

    const io = req.app.get('io');
    const senderName = memo.sender.name;
    for (const recipient of memo.recipients) {
      const payload = {
        memoId: memo.id,
        subject: memo.subject,
        senderName,
        senderId: memo.senderId,
      };
      if (io) io.to(`user:${recipient.userId}`).emit('memo', payload);
      sendPushToUser(recipient.userId, {
        title: `쪽지: ${senderName}`,
        body: trimmedSubject,
        data: { type: 'memo', memoId: memo.id },
      }).catch(() => {});
    }

    return res.status(201).json(formatMemo(memo, { viewerId: req.userId }));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to send memo' });
  }
});

// 읽음 처리 (수신자)
memosRouter.post('/:id/read', async (req, res) => {
  try {
    const row = await prisma.memoRecipient.findFirst({
      where: { memoId: req.params.id, userId: req.userId, deletedAt: null },
    });
    if (!row) return res.status(404).json({ error: 'Memo not found' });

    if (!row.readAt) {
      await prisma.memoRecipient.update({
        where: { id: row.id },
        data: { readAt: new Date() },
      });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to mark memo as read' });
  }
});

// 받은 쪽지 삭제 (수신자 soft delete)
memosRouter.delete('/:id', async (req, res) => {
  try {
    const row = await prisma.memoRecipient.findFirst({
      where: { memoId: req.params.id, userId: req.userId, deletedAt: null },
    });
    if (!row) return res.status(404).json({ error: 'Memo not found' });

    await prisma.memoRecipient.update({
      where: { id: row.id },
      data: { deletedAt: new Date() },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete memo' });
  }
});
