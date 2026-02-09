import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMPANY_NAME = '이맥스';
const DEPT_NAME = '개발부서';
const TEST_USERS = [
  { email: 'test1@test.com', password: '123456', name: '테스트1' },
  { email: 'test2@test.com', password: '123456', name: '테스트2' },
];

async function seed() {
  let company = await prisma.company.findFirst({ where: { name: COMPANY_NAME } });
  if (!company) {
    company = await prisma.company.create({ data: { name: COMPANY_NAME } });
    console.log(`회사 생성: ${COMPANY_NAME}`);
  }
  let dept = await prisma.department.findFirst({
    where: { companyId: company.id, name: DEPT_NAME },
  });
  if (!dept) {
    dept = await prisma.department.create({
      data: { name: DEPT_NAME, companyId: company.id },
    });
    console.log(`부서 생성: ${DEPT_NAME}`);
  }
  for (const u of TEST_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      const updates = {};
      if (existing.departmentId !== dept.id) updates.departmentId = dept.id;
      if (existing.name !== u.name) updates.name = u.name;
      if (Object.keys(updates).length > 0) {
        await prisma.user.update({
          where: { id: existing.id },
          data: updates,
        });
        if (updates.name) console.log(`이름 변경: ${u.email} → ${u.name}`);
        if (updates.departmentId) console.log(`부서 배정: ${u.email} → ${DEPT_NAME}`);
      } else {
        console.log(`이미 있음: ${u.email}`);
      }
      continue;
    }
    const hashed = await bcrypt.hash(u.password, 10);
    await prisma.user.create({
      data: { email: u.email, password: hashed, name: u.name, departmentId: dept.id },
    });
    console.log(`생성: ${u.email} / 비밀번호: ${u.password}`);
  }
  console.log('시드 완료. 이맥스 > 개발부서 > 테스트1·테스트2 트리로 표시됩니다. (전선구는 회원가입 후 assign-jeonsungu.js로 배정)');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
