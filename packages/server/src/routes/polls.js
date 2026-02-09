import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../auth.js';

export const pollsRouter = Router();

pollsRouter.use(authMiddleware);

// Create poll
pollsRouter.post('/', async (req, res) => {
  try {
    const { roomId, question, options, isMultiple } = req.body;
    if (!roomId || !question || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'roomId, question, and at least 2 options required' });
    }

    const member = await prisma.roomMember.findFirst({
      where: { roomId, userId: req.userId, leftAt: null },
    });
    if (!member) return res.status(403).json({ error: 'Not a member of this room' });

    const result = await prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          roomId,
          senderId: req.userId,
          content: `[투표] ${question}`,
        },
        include: { sender: { select: { id: true, name: true, email: true } } },
      });

      const poll = await tx.poll.create({
        data: {
          messageId: message.id,
          question,
          isMultiple: !!isMultiple,
          options: {
            create: options.map((text) => ({ text })),
          },
        },
        include: {
          options: { include: { votes: true } },
        },
      });

      await tx.room.update({
        where: { id: roomId },
        data: { updatedAt: new Date() },
      });

      return { message, poll };
    });

    const pollData = {
      id: result.poll.id,
      question: result.poll.question,
      isMultiple: result.poll.isMultiple,
      options: result.poll.options.map((o) => ({
        id: o.id,
        text: o.text,
        voteCount: 0,
        voted: false,
      })),
    };

    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('message', {
        ...result.message,
        readCount: 0,
        poll: pollData,
      });
    }

    return res.json({ message: result.message, poll: pollData });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create poll' });
  }
});

// Vote on poll
pollsRouter.post('/:pollId/vote', async (req, res) => {
  try {
    const { optionId } = req.body;
    if (!optionId) return res.status(400).json({ error: 'optionId required' });

    const poll = await prisma.poll.findUnique({
      where: { id: req.params.pollId },
      include: { message: { select: { roomId: true } }, options: true },
    });
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    const member = await prisma.roomMember.findFirst({
      where: { roomId: poll.message.roomId, userId: req.userId, leftAt: null },
    });
    if (!member) return res.status(403).json({ error: 'Not a member of this room' });

    const option = poll.options.find((o) => o.id === optionId);
    if (!option) return res.status(400).json({ error: 'Invalid option' });

    if (!poll.isMultiple) {
      // Single choice: remove existing votes first
      const existingVotes = await prisma.pollVote.findMany({
        where: {
          userId: req.userId,
          option: { pollId: poll.id },
        },
      });
      if (existingVotes.length > 0) {
        await prisma.pollVote.deleteMany({
          where: { id: { in: existingVotes.map((v) => v.id) } },
        });
      }
    }

    // Toggle: if already voted for this option, remove it
    const existing = await prisma.pollVote.findUnique({
      where: { optionId_userId: { optionId, userId: req.userId } },
    });
    if (existing) {
      await prisma.pollVote.delete({ where: { id: existing.id } });
    } else {
      await prisma.pollVote.create({
        data: { optionId, userId: req.userId },
      });
    }

    // Fetch updated poll
    const updated = await prisma.poll.findUnique({
      where: { id: poll.id },
      include: {
        options: { include: { votes: true } },
      },
    });

    const pollResult = {
      id: updated.id,
      question: updated.question,
      isMultiple: updated.isMultiple,
      messageId: updated.messageId,
      options: updated.options.map((o) => ({
        id: o.id,
        text: o.text,
        voteCount: o.votes.length,
        voterIds: o.votes.map((v) => v.userId),
      })),
    };

    const io = req.app.get('io');
    if (io) {
      io.to(poll.message.roomId).emit('poll_voted', pollResult);
    }

    return res.json(pollResult);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to vote' });
  }
});

// Get poll details
pollsRouter.get('/:pollId', async (req, res) => {
  try {
    const poll = await prisma.poll.findUnique({
      where: { id: req.params.pollId },
      include: {
        message: { select: { roomId: true } },
        options: { include: { votes: true } },
      },
    });
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    const member = await prisma.roomMember.findFirst({
      where: { roomId: poll.message.roomId, userId: req.userId, leftAt: null },
    });
    if (!member) return res.status(403).json({ error: 'Not a member of this room' });

    return res.json({
      id: poll.id,
      question: poll.question,
      isMultiple: poll.isMultiple,
      messageId: poll.messageId,
      options: poll.options.map((o) => ({
        id: o.id,
        text: o.text,
        voteCount: o.votes.length,
        voterIds: o.votes.map((v) => v.userId),
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch poll' });
  }
});
