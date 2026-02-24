import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? [{ emit: 'stdout', level: 'warn' }, { emit: 'stdout', level: 'error' }]
    : [{ emit: 'stdout', level: 'error' }],
});

// 프로세스 종료 시 연결 정리
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
