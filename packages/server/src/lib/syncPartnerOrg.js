/**
 * 거래처 조직 → PostgreSQL Company/Department 동기화 + User 부서 매핑(이메일/외부사원ID).
 * 메신저 계정은 자동 생성하지 않는다(보안). 이미 있는 User만 departmentId 갱신.
 */
import { prisma } from '../db.js';
import { fetchPartnerOrg } from './partnerOrg.js';
import { isPartnerOrgEnabled, getPartnerOrgSource } from './partnerMssql.js';

function partnerCompanyName() {
  return (process.env.PARTNER_COMPANY_NAME || '파트너').trim() || '파트너';
}

function partnerCompanyExternalCode(departments) {
  const fromEnv = (process.env.PARTNER_COMPANY_EXTERNAL_CODE || '').trim();
  if (fromEnv) return fromEnv;
  const bs = departments.find((d) => d.businessCode)?.businessCode;
  return bs || 'PARTNER';
}

/**
 * @param {{ dryRun?: boolean }} [opts]
 */
export async function syncPartnerOrg(opts = {}) {
  const dryRun = !!opts.dryRun;
  if (!isPartnerOrgEnabled()) {
    return {
      ok: false,
      error: 'PARTNER_ORG_SOURCE is off (set mock or mssql)',
      source: getPartnerOrgSource(),
    };
  }

  const { departments, employees, source } = await fetchPartnerOrg();
  const companyExt = partnerCompanyExternalCode(departments);
  const companyName = partnerCompanyName();

  const stats = {
    source,
    dryRun,
    companyExternalCode: companyExt,
    departmentsFetched: departments.length,
    employeesFetched: employees.length,
    departmentsUpserted: 0,
    usersMatched: 0,
    usersUpdated: 0,
    usersUnmatched: 0,
    unmatchedEmails: /** @type {string[]} */ ([]),
    employeesWithoutEmail: 0,
    employeesWithoutDept: 0,
  };

  if (dryRun) {
    const emails = employees.filter((e) => e.email).map((e) => e.email);
    const existing = emails.length
      ? await prisma.user.findMany({
          where: { email: { in: emails } },
          select: { email: true },
        })
      : [];
    const existingSet = new Set(existing.map((u) => u.email.toLowerCase()));
    for (const e of employees) {
      if (!e.email) {
        stats.employeesWithoutEmail += 1;
        continue;
      }
      if (!e.deptCode) stats.employeesWithoutDept += 1;
      if (existingSet.has(e.email)) stats.usersMatched += 1;
      else {
        stats.usersUnmatched += 1;
        if (stats.unmatchedEmails.length < 50) stats.unmatchedEmails.push(e.email);
      }
    }
    return { ok: true, ...stats };
  }

  const company = await prisma.company.upsert({
    where: { externalCode: companyExt },
    create: { name: companyName, externalCode: companyExt },
    update: { name: companyName },
  });

  /** @type {Map<string, string>} deptCode → pg department id */
  const deptIdByCode = new Map();

  // 1차: 부서 upsert (부모는 나중에)
  for (const d of departments) {
    const existing = await prisma.department.findFirst({
      where: { companyId: company.id, externalCode: d.deptCode },
    });
    const sortOrder = (Number(d.level) || 1) * 1000;
    let row;
    if (existing) {
      row = await prisma.department.update({
        where: { id: existing.id },
        data: { name: d.deptName, sortOrder },
      });
    } else {
      row = await prisma.department.create({
        data: {
          name: d.deptName,
          companyId: company.id,
          externalCode: d.deptCode,
          sortOrder,
          parentId: null,
        },
      });
    }
    deptIdByCode.set(d.deptCode, row.id);
    stats.departmentsUpserted += 1;
  }

  // 2차: 부모 연결
  for (const d of departments) {
    const id = deptIdByCode.get(d.deptCode);
    if (!id) continue;
    const parentId = d.upDept ? deptIdByCode.get(d.upDept) ?? null : null;
    await prisma.department.update({
      where: { id },
      data: { parentId: parentId && parentId !== id ? parentId : null },
    });
  }

  // 이메일로 User 매칭
  const emails = [...new Set(employees.map((e) => e.email).filter(Boolean))];
  const users = emails.length
    ? await prisma.user.findMany({
        where: { email: { in: emails } },
        select: { id: true, email: true, departmentId: true, name: true, phone: true, jobTitle: true, externalEmpId: true },
      })
    : [];
  const userByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

  for (const e of employees) {
    if (!e.email) {
      stats.employeesWithoutEmail += 1;
      continue;
    }
    if (!e.deptCode) stats.employeesWithoutDept += 1;

    const user = userByEmail.get(e.email);
    if (!user) {
      stats.usersUnmatched += 1;
      if (stats.unmatchedEmails.length < 50) stats.unmatchedEmails.push(e.email);
      continue;
    }
    stats.usersMatched += 1;

    const departmentId = e.deptCode ? deptIdByCode.get(e.deptCode) ?? null : null;
    const jobTitle = e.dutyCode || e.positionCode || user.jobTitle || null;
    const data = {
      departmentId,
      externalEmpId: e.masterId,
      ...(e.name ? { name: e.name } : {}),
      ...(e.phone ? { phone: e.phone } : {}),
      ...(jobTitle ? { jobTitle } : {}),
    };

    const changed =
      user.departmentId !== departmentId
      || user.externalEmpId !== e.masterId
      || (e.name && user.name !== e.name)
      || (e.phone && user.phone !== e.phone)
      || (jobTitle && user.jobTitle !== jobTitle);

    if (changed) {
      await prisma.user.update({ where: { id: user.id }, data });
      stats.usersUpdated += 1;
    }
  }

  return { ok: true, companyId: company.id, ...stats };
}
