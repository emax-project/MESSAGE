import { prisma } from '../db.js';

/** ADMIN_EMAIL env (comma-separated) → lowercase email list */
export function getAdminEmails() {
  return (process.env.ADMIN_EMAIL || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email) {
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) return false;
  const userEmail = (email || '').trim().toLowerCase();
  return adminEmails.includes(userEmail);
}

/**
 * Require ADMIN_EMAIL whitelist match for req.userId.
 * On failure, sends 503/403 and returns null. On success, returns { email }.
 */
export async function assertAdmin(req, res) {
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) {
    res.status(503).json({ error: 'Admin not configured (ADMIN_EMAIL)' });
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { email: true },
  });
  const userEmail = (user?.email || '').trim().toLowerCase();
  if (!user || !adminEmails.includes(userEmail)) {
    res.status(403).json({ error: 'Admin only' });
    return null;
  }
  return user;
}
