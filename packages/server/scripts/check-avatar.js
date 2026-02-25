#!/usr/bin/env node
/**
 * Room 아바타 저장 여부 확인 스크립트
 * 사용: node scripts/check-avatar.js [방이름검색어]
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const search = process.argv[2] || '';
  const rooms = await prisma.room.findMany({
    where: search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { initials: { contains: search, mode: 'insensitive' } }] }
      : {},
    select: { id: true, name: true, avatarUrl: true, initials: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });

  console.log('\n=== Room 아바타 저장 현황 ===\n');
  if (rooms.length === 0) {
    console.log('조회된 방이 없습니다.');
    return;
  }
  for (const r of rooms) {
    console.log(`방이름: ${r.name || '(없음)'}`);
    console.log(`  id: ${r.id}`);
    console.log(`  avatarUrl(DB): ${r.avatarUrl ?? '(없음)'}`);
    console.log(`  initials: ${r.initials ?? '(없음)'}`);
    console.log(`  updatedAt: ${r.updatedAt}`);
    console.log('');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
