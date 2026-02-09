import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_EMAIL = 'test3@test.com';

async function run() {
  const user = await prisma.user.findUnique({
    where: { email: SEED_EMAIL },
  });
  if (!user) {
    console.log(`이메일 "${SEED_EMAIL}" 사용자가 없습니다.`);
    process.exit(0);
  }
  await prisma.user.delete({
    where: { id: user.id },
  });
  console.log(`시드 계정 "${user.name}"(${SEED_EMAIL})을 삭제했습니다.`);
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
