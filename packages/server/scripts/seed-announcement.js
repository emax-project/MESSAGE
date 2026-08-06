import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_ITEMS = [
  {
    title: '사내 메신저 오픈 안내',
    content: `안녕하세요, 이맥스 임직원 여러분.

EMAX 사내 메신저 베타 서비스를 시작합니다.
• 조직도에서 동료에게 바로 DM을 보낼 수 있습니다.
• 알림 탭에서 멘션과 공지를 확인하세요.

문의: 개발부서`,
    updatedAt: new Date('2026-08-05T09:00:00+09:00'),
  },
  {
    title: '8월 정기 점검 안내',
    content: `[전체 공지 테스트]

8월 10일(일) 02:00~04:00 서버 정기 점검이 예정되어 있습니다.
점검 시간에는 메신저 접속이 일시 중단될 수 있습니다.

양해 부탁드립니다.`,
    updatedAt: new Date('2026-08-06T14:00:00+09:00'),
  },
];

async function seed() {
  const marker = '사내 메신저 오픈 안내';
  const existing = await prisma.announcement.count({
    where: { title: { in: TEST_ITEMS.map((item) => item.title) } },
  });
  if (existing >= TEST_ITEMS.length) {
    console.log('이미 공지 테스트 데이터 2건이 있습니다. 스킵합니다.');
    process.exit(0);
  }

  await prisma.announcement.deleteMany({
    where: {
      OR: [
        { title: { startsWith: '[전체 공지 테스트]' } },
        { content: { startsWith: '[전체 공지 테스트]' } },
      ],
    },
  });

  for (const item of TEST_ITEMS) {
    const row = await prisma.announcement.create({
      data: {
        title: item.title,
        content: item.content,
      },
    });
    await prisma.announcement.update({
      where: { id: row.id },
      data: { updatedAt: item.updatedAt },
    });
    console.log(`생성: ${item.title}`);
  }

  console.log(`공지 테스트 데이터 ${TEST_ITEMS.length}건 추가 완료. (마커: ${marker})`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
