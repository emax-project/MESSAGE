import jwt from 'jsonwebtoken';
import { prisma } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function verifySessionToken(token) {
  const payload = verifyToken(token);
  if (!payload?.userId || !payload?.sessionId) return null;
  const session = await prisma.userSession.findUnique({
    where: { id: payload.sessionId },
    select: { userId: true },
  });
  if (!session || String(session.userId) !== String(payload.userId)) return null;
  return payload;
}

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const payload = await verifySessionToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.userId = payload.userId;
  req.sessionId = payload.sessionId;
  next();
}
