import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../auth.js';

export const orgGroupsRouter = Router();

orgGroupsRouter.use(authMiddleware);

const memberSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  jobTitle: true,
  statusMessage: true,
  avatarUrl: true,
  updatedAt: true,
};

function toMember(u) {
  const ver = u.updatedAt ? `?v=${new Date(u.updatedAt).getTime()}` : '';
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? null,
    jobTitle: u.jobTitle ?? null,
    statusMessage: u.statusMessage ?? null,
    avatarUrl: u.avatarUrl ? `/users/${u.id}/avatar${ver}` : null,
  };
}

function toGroup(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    members: (row.members ?? []).map((m) => toMember(m.member)),
  };
}

/** GET /org-groups — 내 그룹 + 멤버 */
orgGroupsRouter.get('/', async (req, res) => {
  try {
    const rows = await prisma.orgGroup.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
      include: {
        members: {
          orderBy: { createdAt: 'asc' },
          include: { member: { select: memberSelect } },
        },
      },
    });
    return res.json(rows.map(toGroup));
  } catch (err) {
    console.error('[org-groups GET]', err);
    return res.status(500).json({ error: 'Failed to fetch org groups' });
  }
});

/** POST /org-groups — 그룹 생성 */
orgGroupsRouter.post('/', async (req, res) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) return res.status(400).json({ error: '그룹 이름을 입력해주세요' });
    const row = await prisma.orgGroup.create({
      data: { userId: req.userId, name: name.slice(0, 50) },
      include: {
        members: {
          include: { member: { select: memberSelect } },
        },
      },
    });
    return res.status(201).json(toGroup(row));
  } catch (err) {
    console.error('[org-groups POST]', err);
    return res.status(500).json({ error: 'Failed to create org group' });
  }
});

/** PUT /org-groups/:id — 이름 변경 */
orgGroupsRouter.put('/:id', async (req, res) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) return res.status(400).json({ error: '그룹 이름을 입력해주세요' });
    const group = await prisma.orgGroup.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    const row = await prisma.orgGroup.update({
      where: { id: group.id },
      data: { name: name.slice(0, 50) },
      include: {
        members: {
          orderBy: { createdAt: 'asc' },
          include: { member: { select: memberSelect } },
        },
      },
    });
    return res.json(toGroup(row));
  } catch (err) {
    console.error('[org-groups PUT]', err);
    return res.status(500).json({ error: 'Failed to update org group' });
  }
});

/** DELETE /org-groups/:id */
orgGroupsRouter.delete('/:id', async (req, res) => {
  try {
    const group = await prisma.orgGroup.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    await prisma.orgGroup.delete({ where: { id: group.id } });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[org-groups DELETE]', err);
    return res.status(500).json({ error: 'Failed to delete org group' });
  }
});

/** POST /org-groups/:id/members — { userId } */
orgGroupsRouter.post('/:id/members', async (req, res) => {
  try {
    const memberUserId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';
    if (!memberUserId) return res.status(400).json({ error: 'userId required' });
    if (memberUserId === req.userId) {
      return res.status(400).json({ error: '자기 자신은 그룹에 추가할 수 없습니다' });
    }

    const group = await prisma.orgGroup.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const user = await prisma.user.findUnique({
      where: { id: memberUserId },
      select: { id: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await prisma.orgGroupMember.upsert({
      where: {
        groupId_memberUserId: { groupId: group.id, memberUserId },
      },
      create: { groupId: group.id, memberUserId },
      update: {},
    });

    const row = await prisma.orgGroup.findUnique({
      where: { id: group.id },
      include: {
        members: {
          orderBy: { createdAt: 'asc' },
          include: { member: { select: memberSelect } },
        },
      },
    });
    return res.status(201).json(toGroup(row));
  } catch (err) {
    console.error('[org-groups members POST]', err);
    return res.status(500).json({ error: 'Failed to add member' });
  }
});

/** DELETE /org-groups/:id/members/:userId */
orgGroupsRouter.delete('/:id/members/:userId', async (req, res) => {
  try {
    const group = await prisma.orgGroup.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    await prisma.orgGroupMember.deleteMany({
      where: { groupId: group.id, memberUserId: req.params.userId },
    });

    const row = await prisma.orgGroup.findUnique({
      where: { id: group.id },
      include: {
        members: {
          orderBy: { createdAt: 'asc' },
          include: { member: { select: memberSelect } },
        },
      },
    });
    return res.json(toGroup(row));
  } catch (err) {
    console.error('[org-groups members DELETE]', err);
    return res.status(500).json({ error: 'Failed to remove member' });
  }
});
