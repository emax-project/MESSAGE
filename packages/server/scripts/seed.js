import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMPANY_NAME = '이맥스';

/**
 * 회사 > 본부/부서 > 팀 2단 계층.
 * users: 해당 부서(팀)에 둘 테스트 계정 (없으면 생성)
 */
const ORG = [
  {
    name: '경영지원본부',
    sortOrder: 10,
    children: [
      {
        name: '인사팀',
        sortOrder: 11,
        users: [
          { email: 'hr1@test.com', password: '123456', name: '김인사', phone: '010-3000-1001', jobTitle: '대리' },
        ],
      },
      {
        name: '총무팀',
        sortOrder: 12,
        users: [
          { email: 'ga1@test.com', password: '123456', name: '박총무', phone: '010-3000-1002', jobTitle: '사원' },
        ],
      },
    ],
  },
  {
    name: '개발부서',
    sortOrder: 20,
    children: [
      {
        name: '플랫폼팀',
        sortOrder: 21,
        users: [
          { email: 'test1@test.com', password: '123456', name: '테스트1', phone: '010-1234-5678', jobTitle: '대리' },
          { email: 'dev.platform2@test.com', password: '123456', name: '최플랫폼', phone: '010-4000-2001', jobTitle: '사원' },
        ],
      },
      {
        name: '앱개발팀',
        sortOrder: 22,
        users: [
          { email: 'test2@test.com', password: '123456', name: '테스트2', phone: '010-2345-6789', jobTitle: '과장' },
          { email: 'dev.app2@test.com', password: '123456', name: '한앱개발', phone: '010-4000-2002', jobTitle: '대리' },
        ],
      },
    ],
  },
  {
    name: '영업본부',
    sortOrder: 30,
    children: [
      {
        name: '영업1팀',
        sortOrder: 31,
        users: [
          { email: 'sales1@test.com', password: '123456', name: '이영업', phone: '010-5000-3001', jobTitle: '과장' },
        ],
      },
      {
        name: '영업2팀',
        sortOrder: 32,
        users: [
          { email: 'sales2@test.com', password: '123456', name: '정영업', phone: '010-5000-3002', jobTitle: '대리' },
        ],
      },
    ],
  },
];

async function ensureDept(companyId, name, parentId, sortOrder) {
  let dept = await prisma.department.findFirst({
    where: { companyId, name, parentId: parentId ?? null },
  });
  if (!dept) {
    // 예전 시드: parentId 없이 '개발부서'만 있는 경우 → 같은 이름이면 승격/재사용
    dept = await prisma.department.findFirst({
      where: { companyId, name },
    });
  }
  if (!dept) {
    dept = await prisma.department.create({
      data: { name, companyId, parentId: parentId ?? null, sortOrder },
    });
    console.log(`부서 생성: ${name}${parentId ? ' (하위)' : ''}`);
  } else {
    const data = {};
    if (dept.parentId !== (parentId ?? null)) data.parentId = parentId ?? null;
    if (dept.sortOrder !== sortOrder) data.sortOrder = sortOrder;
    if (Object.keys(data).length) {
      dept = await prisma.department.update({ where: { id: dept.id }, data });
      console.log(`부서 갱신: ${name}`);
    } else {
      console.log(`부서 유지: ${name}`);
    }
  }
  return dept;
}

async function ensureUser(u, departmentId, deptLabel) {
  const existing = await prisma.user.findUnique({ where: { email: u.email } });
  if (existing) {
    const updates = {};
    if (existing.departmentId !== departmentId) updates.departmentId = departmentId;
    if (existing.name !== u.name) updates.name = u.name;
    if (u.phone != null && existing.phone !== u.phone) updates.phone = u.phone;
    if (u.jobTitle != null && existing.jobTitle !== u.jobTitle) updates.jobTitle = u.jobTitle;
    if (Object.keys(updates).length) {
      await prisma.user.update({ where: { id: existing.id }, data: updates });
      console.log(`사용자 갱신: ${u.email} → ${deptLabel}`);
    } else {
      console.log(`이미 있음: ${u.email}`);
    }
    return;
  }
  const hashed = await bcrypt.hash(u.password, 10);
  await prisma.user.create({
    data: {
      email: u.email,
      password: hashed,
      name: u.name,
      departmentId,
      phone: u.phone ?? null,
      jobTitle: u.jobTitle ?? null,
    },
  });
  console.log(`생성: ${u.email} / ${u.password} → ${deptLabel}`);
}

async function seed() {
  let company = await prisma.company.findFirst({ where: { name: COMPANY_NAME } });
  if (!company) {
    company = await prisma.company.create({ data: { name: COMPANY_NAME } });
    console.log(`회사 생성: ${COMPANY_NAME}`);
  }

  for (const top of ORG) {
    const parent = await ensureDept(company.id, top.name, null, top.sortOrder);
    for (const child of top.children || []) {
      const team = await ensureDept(company.id, child.name, parent.id, child.sortOrder);
      for (const u of child.users || []) {
        await ensureUser(u, team.id, `${top.name} > ${child.name}`);
      }
    }
  }

  console.log('시드 완료. 예: 이맥스 > 개발부서 > 플랫폼팀 / 앱개발팀');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
