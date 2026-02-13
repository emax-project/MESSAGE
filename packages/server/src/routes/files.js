import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../db.js';
import { authMiddleware } from '../auth.js';
import { upload, UPLOAD_DIR } from '../upload.js';

export const filesRouter = Router();

filesRouter.use(authMiddleware);

// BigInt → Number 변환 (JSON 직렬화용)
function toJson(obj) {
  return JSON.parse(JSON.stringify(obj, (_key, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
}

// POST /files/upload — Upload a file and create a file message
filesRouter.post('/upload', (req, res, next) => {
  // 대용량 파일 업로드를 위한 타임아웃 해제
  req.setTimeout(0);
  res.setTimeout(0);
  next();
}, upload.single('file'), async (req, res) => {
  try {
    const { roomId } = req.body;
    if (!roomId) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'roomId is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const member = await prisma.roomMember.findFirst({
      where: { roomId, userId: req.userId },
    });
    if (!member) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Not a member of this room' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf-8');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const userContent = req.body.content?.trim();

    const message = await prisma.message.create({
      data: {
        roomId,
        senderId: req.userId,
        content: userContent || `[파일] ${originalName}`,
        fileUrl,
        fileName: originalName,
        fileSize: BigInt(req.file.size),
        fileMimeType: req.file.mimetype,
        fileExpiresAt: expiresAt,
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.room.update({
      where: { id: roomId },
      data: { updatedAt: now },
    });
    await prisma.roomMember.updateMany({
      where: { roomId, userId: req.userId },
      data: { lastReadAt: now },
    });

    const jsonMessage = toJson(message);
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('message', { ...jsonMessage, readCount: 0 });
    }

    return res.status(201).json(jsonMessage);
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error(err);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

// GET /files/download/:messageId — Download a file by message ID
filesRouter.get('/download/:messageId', async (req, res) => {
  try {
    const message = await prisma.message.findUnique({
      where: { id: req.params.messageId },
    });

    if (!message || !message.fileUrl) {
      return res.status(404).json({ error: 'File not found' });
    }

    const member = await prisma.roomMember.findFirst({
      where: { roomId: message.roomId, userId: req.userId },
    });
    if (!member) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (message.fileExpiresAt && new Date() > message.fileExpiresAt) {
      return res.status(410).json({ error: 'File has expired' });
    }

    const filename = path.basename(message.fileUrl);
    const filePath = path.join(UPLOAD_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File no longer exists on disk' });
    }

    const downloadName = message.fileName || filename;
    // RFC 5987: 한글 등 UTF-8 파일명이 깨지지 않도록 filename*=UTF-8'' 사용
    const asciiFallback = /^[\x20-\x7e]*$/.test(downloadName) ? downloadName : 'download';
    const encoded = encodeURIComponent(downloadName);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiFallback.replace(/"/g, '\\"')}"; filename*=UTF-8''${encoded}`
    );
    if (message.fileMimeType) {
      res.setHeader('Content-Type', message.fileMimeType);
    }

    return res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Download failed' });
  }
});
