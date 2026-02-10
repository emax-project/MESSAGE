import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../auth.js';

export const foldersRouter = Router();

foldersRouter.use(authMiddleware);

// List my folders
foldersRouter.get('/', async (req, res) => {
  try {
    const folders = await prisma.folder.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
    });
    return res.json(folders);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// Create folder
foldersRouter.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: '폴더 이름을 입력해주세요' });
    }
    const folder = await prisma.folder.create({
      data: { userId: req.userId, name: name.trim() },
    });
    return res.status(201).json(folder);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Delete folder
foldersRouter.delete('/:id', async (req, res) => {
  try {
    const folder = await prisma.folder.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    await prisma.folder.delete({ where: { id: folder.id } });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// Assign room to folder
foldersRouter.put('/assign', async (req, res) => {
  try {
    const { roomId, folderId } = req.body;
    if (!roomId) return res.status(400).json({ error: 'roomId required' });

    const member = await prisma.roomMember.findFirst({
      where: { roomId, userId: req.userId, leftAt: null },
    });
    if (!member) return res.status(404).json({ error: 'Not a member' });

    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: folderId, userId: req.userId },
      });
      if (!folder) return res.status(404).json({ error: 'Folder not found' });
    }

    await prisma.roomMember.update({
      where: { id: member.id },
      data: { folderId: folderId || null },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to assign folder' });
  }
});
