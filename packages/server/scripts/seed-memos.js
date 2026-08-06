import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MARKER = '[memo-test]';

const SAMPLES = [
  {
    senderEmail: 'test2@test.com',
    recipientEmail: 'test1@test.com',
    subject: '내일 스탠드업 일정 공유',
    body: `${MARKER} 내일 오전 10시 스탠드업 전에 진행 중인 이슈 정리 부탁드립니다.`,
  },
  {
    senderEmail: 'test2@test.com',
    recipientEmail: 'test1@test.com',
    subject: '배포 체크리스트 검토 요청',
    body: `${MARKER} 이번 주 배포 전 체크리스트 확인 후 회신 부탁드립니다.`,
  },
  {
    senderEmail: 'test1@test.com',
    recipientEmail: 'test2@test.com',
    subject: '회의록 공유',
    body: `${MARKER} 오늘 기획 회의록 공유드립니다. 검토 후 의견 주세요.`,
  },
];

async function seed() {
  const users = await prisma.user.findMany({
    where: { email: { in: ['test1@test.com', 'test2@test.com'] } },
    select: { id: true, email: true, name: true },
  });
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u]));
  if (!byEmail['test1@test.com'] || !byEmail['test2@test.com']) {
    console.log('test1@test.com / test2@test.com 계정이 없습니다. npm run db:seed 먼저 실행하세요.');
    process.exit(1);
  }

  const existing = await prisma.memo.count({
    where: { body: { contains: MARKER } },
  });
  if (existing > 0) {
    console.log(`이미 쪽지 테스트 데이터가 ${existing}건 있습니다. 스킵합니다.`);
    process.exit(0);
  }

  for (const sample of SAMPLES) {
    const sender = byEmail[sample.senderEmail];
    const recipient = byEmail[sample.recipientEmail];
    const memo = await prisma.memo.create({
      data: {
        senderId: sender.id,
        subject: sample.subject,
        body: sample.body,
        recipients: {
          create: [{ userId: recipient.id }],
        },
      },
    });
    console.log(`생성: ${sender.name} → ${recipient.name} | ${sample.subject}`);
  }

  console.log('쪽지 테스트 데이터 3건 추가 완료.');
  console.log('- test1@test.com: 받은 쪽지 2건 (테스트2 → 테스트1)');
  console.log('- test2@test.com: 받은 쪽지 1건 (테스트1 → 테스트2)');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
