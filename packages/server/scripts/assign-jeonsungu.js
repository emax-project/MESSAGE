import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEPT_NAME = '개발부서';
const USER_NAME = '전선구';

async function run() {
  const dept = await prisma.department.findFirst({
    where: { name: DEPT_NAME },
  });
  if (!dept) {
    console.log('개발부서가 없습니다. 시드를 먼저 실행하세요.');
    process.exit(1);
  }

  const users = await prisma.user.findMany({
    where: { name: USER_NAME, departmentId: null },
  });
  if (users.length === 0) {
    console.log(`부서가 없는 사용자 "${USER_NAME}"(이)가 없습니다. (이미 배정되었거나 해당 이름이 없음)`);
    process.exit(0);
  }

  const result = await prisma.user.updateMany({
    where: { name: USER_NAME, departmentId: null },
    data: { departmentId: dept.id },
  });
  console.log(`"${USER_NAME}" 사용자 ${result.count}명을 개발부서로 배정했습니다.`);
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
