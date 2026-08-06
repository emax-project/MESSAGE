import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MARKER = '[mention-test]';

const SAMPLES = [
  {
    senderEmail: 'test2@test.com',
    mentioneeEmail: 'test1@test.com',
    content: `${MARKER} @테스트1 내일 스탠드업 전에 이슈 한번 봐주세요.`,
  },
  {
    senderEmail: 'test1@test.com',
    mentioneeEmail: 'test2@test.com',
    content: `${MARKER} @테스트2 배포 체크리스트 공유드립니다.`,
  },
];

async function findSharedRoom(userAId, userBId) {
  const memberships = await prisma.roomMember.findMany({
    where: { userId: userAId, leftAt: null },
    select: { roomId: true },
  });
  const roomIds = memberships.map((m) => m.roomId);
  if (roomIds.length === 0) return null;

  const shared = await prisma.roomMember.findFirst({
    where: {
      userId: userBId,
      leftAt: null,
      roomId: { in: roomIds },
      room: { isGroup: false },
    },
    select: { roomId: true },
  });
  return shared?.roomId ?? null;
}

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

  const test1 = byEmail['test1@test.com'];
  const test2 = byEmail['test2@test.com'];
  const roomId = await findSharedRoom(test1.id, test2.id);
  if (!roomId) {
    console.log('테스트1·테스트2 공통 DM 방이 없습니다. 앱에서 1:1 대화를 한 번 열어 주세요.');
    process.exit(1);
  }

  const existing = await prisma.message.count({
    where: { roomId, content: { contains: MARKER } },
  });
  if (existing > 0) {
    console.log(`이미 멘션 테스트 데이터가 ${existing}건 있습니다. 스킵합니다.`);
    process.exit(0);
  }

  for (const sample of SAMPLES) {
    const sender = byEmail[sample.senderEmail];
    const mentionee = byEmail[sample.mentioneeEmail];
    const message = await prisma.message.create({
      data: {
        roomId,
        senderId: sender.id,
        content: sample.content,
      },
    });
    await prisma.mention.create({
      data: {
        messageId: message.id,
        userId: mentionee.id,
      },
    });
    console.log(`생성: ${sender.name} → ${mentionee.name} | ${sample.content.replace(MARKER, '').trim()}`);
  }

  console.log('멘션 테스트 데이터 2건 추가 완료. test1 / test2 로그인 후 알림 탭에서 확인하세요.');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
