import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { roomsRouter } from './routes/rooms.js';
import { orgRouter } from './routes/org.js';
import { filesRouter } from './routes/files.js';
import { announcementRouter } from './routes/announcement.js';
import { eventsRouter } from './routes/events.js';
import { pollsRouter } from './routes/polls.js';
import { projectsRouter } from './routes/projects.js';
import { bookmarksRouter } from './routes/bookmarks.js';
import { mentionsRouter } from './routes/mentions.js';
import { linkPreviewRouter } from './routes/linkPreview.js';
import { foldersRouter } from './routes/folders.js';
import { prisma } from './db.js';
import { verifySessionToken } from './auth.js';
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
app.use('/bookmarks', bookmarksRouter);
app.use('/mentions', mentionsRouter);
app.use('/link-preview', linkPreviewRouter());
app.use('/folders', foldersRouter);
// Disable public uploads to enforce auth/expiry checks via /files/download
// app.use('/uploads', express.static(UPLOAD_DIR));

// Health check
app.get('/health', (_, res) => res.json({ ok: true }));

// 웹 클라이언트(SPA) 서빙: client-dist에 index.html이 있으면 정적 파일 + SPA 폴백
const clientDist = process.env.CLIENT_DIST || path.join(__dirname, '..', 'client-dist');
const clientIndexPath = path.join(clientDist, 'index.html');
if (fs.existsSync(clientIndexPath)) {
  app.use(express.static(clientDist, { index: false }));
  app.get('*', (_, res) => res.sendFile(clientIndexPath));
} else {
  app.get('/', (_, res) => {
    res.type('html').send(`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>EMAX</title></head>
<body style="font-family:sans-serif;max-width:560px;margin:2rem auto;padding:0 1rem;">
  <h1>EMAX 메신저 API</h1>
  <p>이 주소는 <strong>API 서버</strong>입니다. 채팅·로그인은 <strong>EMAX 데스크톱 앱</strong>으로 접속해 주세요.</p>
  <p><a href="/health">/health</a> — 서버 상태 확인</p>
</body>
</html>
    `);
  });
}

const PORT = process.env.PORT || 3001;

// Socket.io with CORS for Electron
const io = new Server(httpServer, {
  cors: { origin: true },
  path: '/socket.io',
});

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('auth required'));
  const payload = await verifySessionToken(token);
  if (!payload) return next(new Error('invalid token'));
  socket.userId = payload.userId;
  socket.sessionId = payload.sessionId;
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
