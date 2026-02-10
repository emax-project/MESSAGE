import { prisma } from './db.js';
import * as onlineUsers from './onlineUsers.js';

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    if (socket.userId) {
      const uid = String(socket.userId);
      const wasOnline = onlineUsers.has(uid);
      onlineUsers.add(uid);
      socket.emit('online_list', { userIds: onlineUsers.getAll() });
      if (!wasOnline) {
        io.emit('user_online', { userId: uid });
      }
    }
    socket.on('get_online_list', () => {
      socket.emit('online_list', { userIds: onlineUsers.getAll() });
    });
    socket.on('disconnect', () => {
      if (socket.userId) {
        const uid = String(socket.userId);
        onlineUsers.remove(uid);
        if (!onlineUsers.has(uid)) {
          io.emit('user_offline', { userId: uid });
        }
      }
    });
    async function isRoomMember(roomId, userId) {
      if (!roomId || !userId) return false;
      const member = await prisma.roomMember.findFirst({
        where: { roomId: String(roomId), userId: String(userId), leftAt: null },
        select: { id: true },
      });
      return !!member;
    }

    socket.on('join_room', async (roomId) => {
      if (await isRoomMember(roomId, socket.userId)) {
        socket.join(roomId);
      }
    });

    socket.on('message', async (payload) => {
      const { roomId, content, sharedEvent, replyToId } = payload;
      const text = typeof content === 'string' ? content : '';
      const hasEvent = sharedEvent && typeof sharedEvent === 'object' && sharedEvent.title != null && sharedEvent.startAt != null && sharedEvent.endAt != null;
      if (!roomId || (text === '' && !hasEvent) || socket.userId == null) return;
      try {
        if (!(await isRoomMember(roomId, socket.userId))) return;
        const data = {
          roomId,
          senderId: socket.userId,
          content: text || (hasEvent ? '[일정 공유]' : ''),
        };
        if (hasEvent) {
          data.eventTitle = String(sharedEvent.title);
          data.eventStartAt = new Date(sharedEvent.startAt);
          data.eventEndAt = new Date(sharedEvent.endAt);
          data.eventDescription = sharedEvent.description != null ? String(sharedEvent.description) : null;
        }
        if (replyToId) {
          data.replyToId = String(replyToId);
        }
        const message = await prisma.message.create({
          data,
          include: {
            sender: { select: { id: true, name: true, email: true } },
            replyTo: {
              select: {
                id: true,
                content: true,
                deletedAt: true,
                sender: { select: { id: true, name: true } },
              },
            },
          },
        });
        const now = new Date();
        await prisma.room.update({
          where: { id: roomId },
          data: { updatedAt: now },
        });
        await prisma.roomMember.updateMany({
          where: { roomId, userId: socket.userId },
          data: { lastReadAt: now },
        });

        // Parse mentions from content
        const mentionRegex = /@(\S+)/g;
        let match;
        const mentionNames = [];
        while ((match = mentionRegex.exec(text)) !== null) {
          mentionNames.push(match[1]);
        }
        if (mentionNames.length > 0) {
          const roomMembers = await prisma.roomMember.findMany({
            where: { roomId, leftAt: null },
            include: { user: { select: { id: true, name: true } } },
          });
          for (const rm of roomMembers) {
            if (mentionNames.includes(rm.user.name)) {
              await prisma.mention.create({
                data: { messageId: message.id, userId: rm.userId },
              });
              // Send mention notification to specific user's sockets
              const sockets = await io.fetchSockets();
              for (const s of sockets) {
                if (s.userId === rm.userId) {
                  s.emit('mention', {
                    roomId,
                    messageId: message.id,
                    senderName: message.sender.name,
                    content: text,
                  });
                }
              }
            }
          }
        }

        const replyToData = message.replyTo
          ? {
              id: message.replyTo.id,
              content: message.replyTo.deletedAt ? '[삭제된 메시지]' : message.replyTo.content,
              sender: message.replyTo.sender,
            }
          : null;

        io.to(roomId).emit('message', {
          ...message,
          readCount: 0,
          replyTo: replyToData,
          reactions: [],
          poll: null,
        });
      } catch (e) {
        socket.emit('error', { code: 'MESSAGE_CREATE', message: e.message });
      }
    });

    socket.on('typing', ({ roomId, isTyping }) => {
      if (!roomId) return;
      isRoomMember(roomId, socket.userId).then((ok) => {
        if (ok) {
          socket.to(roomId).emit('typing', { userId: socket.userId, isTyping });
        }
      });
    });

    socket.on('read_receipt', async ({ messageId }) => {
      if (!messageId || socket.userId == null) return;
      try {
        const msg = await prisma.message.findUnique({
          where: { id: messageId },
          select: { roomId: true },
        });
        if (!msg) return;
        if (!(await isRoomMember(msg.roomId, socket.userId))) return;
        const receipt = await prisma.readReceipt.upsert({
          where: {
            messageId_userId: { messageId, userId: socket.userId },
          },
          create: { messageId, userId: socket.userId },
          update: {},
          include: { message: { select: { roomId: true } } },
        });
        io.to(receipt.message.roomId).emit('read_receipt', receipt);
      } catch (e) {
        socket.emit('error', { code: 'READ_RECEIPT', message: e.message });
      }
    });
  });
}
