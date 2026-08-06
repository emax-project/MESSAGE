import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MARKER = '[agenda-test]';

const SAMPLES = [
  {
    name: 'Q3 프로젝트 킥오프',
    description: `${MARKER} 3분기 주요 목표와 일정을 공유하는 아젠다입니다.`,
    viewMode: 'chat',
    isPublic: false,
    initials: 'Q3',
    creatorEmail: 'test1@test.com',
    memberEmails: ['test1@test.com', 'test2@test.com'],
    folderName: '업무',
    messages: [
      {
        senderEmail: 'test1@test.com',
        content: '킥오프 미팅 노트 공유합니다. 이번 분기 목표 확인 부탁드립니다.',
      },
      {
        senderEmail: 'test2@test.com',
        content: '확인했습니다. 일정표 올려두겠습니다.',
      },
    ],
  },
  {
    name: '사내 메신저 피드백',
    description: `${MARKER} 베타 사용 후기와 개선 아이디어를 모으는 게시판 아젠다입니다.`,
    viewMode: 'board',
    isPublic: true,
    initials: 'FB',
    creatorEmail: 'test1@test.com',
    memberEmails: ['test1@test.com', 'test2@test.com'],
    folderName: null,
    messages: [
      {
        senderEmail: 'test2@test.com',
        content: '다크모드 전환 시 일정 캘린더 가독성이 좋아졌습니다.',
      },
      {
        senderEmail: 'test1@test.com',
        content: '쪽지함에 검색 기능이 있으면 좋겠습니다.',
      },
    ],
  },
  {
    name: '8월 업무 공유',
    description: `${MARKER} 월간 업무 현황과 이슈를 정리하는 아젠다입니다.`,
    viewMode: 'chat',
    isPublic: false,
    initials: '8M',
    creatorEmail: 'test2@test.com',
    memberEmails: ['test1@test.com', 'test2@test.com'],
    folderName: null,
    messages: [
      {
        senderEmail: 'test2@test.com',
        content: '8월 2주차 업무 공유드립니다. 배포 일정 참고해 주세요.',
      },
    ],
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

  const existing = await prisma.room.count({
    where: { isTopic: true, description: { contains: MARKER } },
  });
  if (existing > 0) {
    console.log(`이미 아젠다 테스트 데이터가 ${existing}건 있습니다. 스킵합니다.`);
    process.exit(0);
  }

  for (const sample of SAMPLES) {
    const creator = byEmail[sample.creatorEmail];
    const memberIds = [...new Set(sample.memberEmails.map((email) => byEmail[email].id))];

    let folderId = null;
    if (sample.folderName) {
      let folder = await prisma.folder.findFirst({
        where: { userId: creator.id, name: sample.folderName },
      });
      if (!folder) {
        folder = await prisma.folder.create({
          data: { userId: creator.id, name: sample.folderName },
        });
        console.log(`폴더 생성: ${creator.name} / ${sample.folderName}`);
      }
      folderId = folder.id;
    }

    const room = await prisma.$transaction(async (tx) => {
      const created = await tx.room.create({
        data: {
          isGroup: true,
          isTopic: true,
          name: sample.name,
          description: sample.description,
          viewMode: sample.viewMode,
          isPublic: sample.isPublic,
          initials: sample.initials,
          createdBy: creator.id,
          members: {
            create: memberIds.map((userId) => ({ userId })),
          },
        },
        include: {
          members: true,
        },
      });

      if (folderId) {
        const creatorMembership = created.members.find((m) => m.userId === creator.id);
        if (creatorMembership) {
          await tx.roomMember.update({
            where: { id: creatorMembership.id },
            data: { folderId },
          });
        }
      }

      await tx.message.create({
        data: {
          roomId: created.id,
          senderId: creator.id,
          content: `${creator.name}님이 아젠다를 만들었습니다`,
        },
      });

      for (const msg of sample.messages) {
        const sender = byEmail[msg.senderEmail];
        await tx.message.create({
          data: {
            roomId: created.id,
            senderId: sender.id,
            content: msg.content,
          },
        });
      }

      return created;
    });

    const members = sample.memberEmails.map((email) => byEmail[email].name).join(', ');
    console.log(`생성: ${sample.name} (${sample.viewMode}) | 생성자 ${creator.name} | 멤버 ${members}`);
  }

  console.log('아젠다 테스트 데이터 3건 추가 완료.');
  console.log('- test1@test.com: 아젠다 3건 모두 표시 (대화 탭 > 아젠다)');
  console.log('- test2@test.com: 초대된 아젠다 3건 표시');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
