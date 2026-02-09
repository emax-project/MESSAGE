import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { roomsRouter } from './routes/rooms.js';
import { orgRouter } from './routes/org.js';
import { filesRouter } from './routes/files.js';
import { announcementRouter } from './routes/announcement.js';
import { eventsRouter } from './routes/events.js';
import { pollsRouter } from './routes/polls.js';
import { projectsRouter } from './routes/projects.js';
import { prisma } from './db.js';
import { verifyToken } from './auth.js';
import { registerSocketHandlers } from './socket.js';
import { UPLOAD_DIR } from './upload.js';
import { startCleanupJob } from './cleanup.js';

const app = express();
const httpServer = createServer(app);
httpServer.timeout = 0;
httpServer.requestTimeout = 0;
httpServer.headersTimeout = 0;

app.use(cors({ origin: true }));
app.use(express.json());

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/rooms', roomsRouter);
app.use('/org', orgRouter);
app.use('/files', filesRouter);
app.use('/announcement', announcementRouter);
app.use('/events', eventsRouter);
app.use('/polls', pollsRouter);
app.use('/projects', projectsRouter);
// Disable public uploads to enforce auth/expiry checks via /files/download
// app.use('/uploads', express.static(UPLOAD_DIR));

// Health check
app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;

// Socket.io with CORS for Electron
const io = new Server(httpServer, {
  cors: { origin: true },
  path: '/socket.io',
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('auth required'));
  const payload = verifyToken(token);
  if (!payload) return next(new Error('invalid token'));
  socket.userId = payload.userId;
  next();
});

registerSocketHandlers(io);
app.set('io', io);

async function main() {
  await prisma.$connect();
  startCleanupJob();
  httpServer.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
