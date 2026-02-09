import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../auth.js';
import * as onlineUsers from '../onlineUsers.js';

export const orgRouter = Router();
orgRouter.use(authMiddleware);

/** GET /org/online - 현재 로그인(연결) 중인 사용자 ID 목록 */
orgRouter.get('/online', async (_req, res) => {
  try {
    const userIds = onlineUsers.getAll();
    return res.json({ userIds });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to get online users' });
  }
});

/** GET /org/tree - 회사 > 부서 > 사용자 트리 (id, name만, 비밀번호 제외). 로그인한 나는 없으면 첫 부서에 포함 */
orgRouter.get('/tree', async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { name: 'asc' },
      include: {
        departments: {
          orderBy: { name: 'asc' },
          include: {
            users: {
              orderBy: { name: 'asc' },
              select: { id: true, name: true, email: true, statusMessage: true },
            },
          },
        },
      },
    });
    const myId = String(req.userId || '');
    let tree = companies.map((c) => ({
      id: c.id,
      name: c.name,
      departments: c.departments.map((d) => ({
        id: d.id,
        name: d.name,
        users: d.users,
      })),
    }));

    const allUserIds = new Set();
    tree.forEach((c) => c.departments.forEach((d) => d.users.forEach((u) => allUserIds.add(String(u.id)))));
    if (!allUserIds.has(myId)) {
      const me = await prisma.user.findUnique({
        where: { id: myId },
        select: { id: true, name: true, email: true, statusMessage: true },
      });
      if (me && tree.length > 0 && tree[0].departments.length > 0) {
        const firstDept = tree[0].departments[0];
        firstDept.users = [...firstDept.users, me].sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    return res.json(tree);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch org tree' });
  }
});
