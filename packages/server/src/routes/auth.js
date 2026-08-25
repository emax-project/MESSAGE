import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { authMiddleware, signToken } from '../auth.js';
import { isAdminEmail } from '../lib/admin.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password, name required' });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    await prisma.userSession.deleteMany({ where: { userId: user.id } });
    const session = await prisma.userSession.create({ data: { userId: user.id } });
    const token = signToken({ userId: user.id, sessionId: session.id });
    const userWithAdmin = {
      ...user,
      isAdmin: isAdminEmail(user.email),
    };
    return res.status(201).json({ user: userWithAdmin, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    await prisma.userSession.deleteMany({ where: { userId: user.id } });
    const session = await prisma.userSession.create({ data: { userId: user.id } });
    const token = signToken({ userId: user.id, sessionId: session.id });
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        isAdmin: isAdminEmail(user.email),
      },
      token,
    });
  } catch (err) {
    console.error('[auth/login]', err);
    const msg = err?.code === 'P1001' ? '데이터베이스에 연결할 수 없습니다. DB가 실행 중인지 확인해 주세요.' : '로그인 실패';
    return res.status(500).json({ error: msg });
  }
});

authRouter.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, phone: true, jobTitle: true, statusMessage: true, createdAt: true, avatarUrl: true, updatedAt: true },
    });
    if (!user) return res.status(401).json({ error: 'User not found' });
    const avatarVer = user.updatedAt ? `?v=${new Date(user.updatedAt).getTime()}` : '';
    return res.json({
      user: {
        ...user,
        avatarUrl: user.avatarUrl ? `/users/${user.id}/avatar${avatarVer}` : null,
        isAdmin: isAdminEmail(user.email),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to get current user' });
  }
});

authRouter.post('/logout', authMiddleware, async (req, res) => {
  try {
    if (req.sessionId) {
      await prisma.userSession.delete({ where: { id: req.sessionId } }).catch((e) => {
        console.warn('[logout] 세션 삭제 실패 (이미 만료됐을 수 있음):', e.message);
      });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * PUT /auth/password - 본인 비밀번호 변경.
 * body: { currentPassword, newPassword }
 * 관리자 초기화(POST /users/:id/reset-password)와 달리 현재 비밀번호를 확인한다.
 * 성공하면 지금 쓰는 세션만 남기고 나머지는 정리한다.
 */
authRouter.put('/password', authMiddleware, async (req, res) => {
  try {
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!currentPassword) return res.status(400).json({ error: 'CURRENT_PASSWORD_REQUIRED' });
    if (newPassword.length < 4) return res.status(400).json({ error: 'PASSWORD_TOO_SHORT' });
    if (currentPassword === newPassword) return res.status(400).json({ error: 'PASSWORD_UNCHANGED' });

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, password: true },
    });
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    const ok = await bcrypt.compare(currentPassword, user.password);
    // 401이 아니라 400을 쓴다. 요청 자체는 인증된 상태이고 본문 값이 틀린 것이며,
    // 클라이언트는 모든 401을 세션 만료로 보고 강제 로그아웃시키기 때문이다.
    if (!ok) return res.status(400).json({ error: 'CURRENT_PASSWORD_MISMATCH' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { password: hashed } }),
      // 지금 창은 그대로 쓰게 두고, 다른 기기에 남은 세션만 끊는다
      prisma.userSession.deleteMany({
        where: { userId: user.id, id: { not: req.sessionId } },
      }),
    ]);

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to change password' });
  }
});
