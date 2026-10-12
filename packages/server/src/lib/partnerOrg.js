/**
 * 거래처 조직/사원 조회.
 * 스키마: DEPT_TREE_V, HR_EMPLOYEE_MASTER, HR_EMPLOYEE_INFO, HR_EMPLOYEE_APPOINTMENT
 */
import { getPartnerOrgSource, getPartnerPool, sql } from './partnerMssql.js';
import { fetchHrTitleMap, pickEmployeeJobTitle } from './partnerHrTitles.js';

const WORK_STATE_ACTIVE = process.env.PARTNER_WORK_STATE_ACTIVE || 'hr009100';

/** @typedef {{ deptCode: string, deptName: string, upDept: string | null, level: number, businessCode: string | null }} PartnerDept */
/** @typedef {{ masterId: string, empNo: string | null, name: string, email: string | null, phone: string | null, deptCode: string | null, positionCode: string | null, dutyCode: string | null }} PartnerEmployee */

/** IP 열리기 전 로컬 검증용 목 데이터 */
export function getMockPartnerOrg() {
  /** @type {PartnerDept[]} */
  const departments = [
    { deptCode: 'ROOT', deptName: '본사', upDept: null, level: 1, businessCode: 'BS01' },
    { deptCode: 'DEV', deptName: '개발본부', upDept: 'ROOT', level: 2, businessCode: 'BS01' },
    { deptCode: 'DEV1', deptName: '플랫폼팀', upDept: 'DEV', level: 3, businessCode: 'BS01' },
    { deptCode: 'SALES', deptName: '영업본부', upDept: 'ROOT', level: 2, businessCode: 'BS01' },
  ];
  /** @type {PartnerEmployee[]} */
  const employees = [
    {
      masterId: '1001',
      empNo: 'E1001',
      name: '김파트너',
      email: 'partner1@example.com',
      phone: '010-1111-1111',
      deptCode: 'DEV1',
      positionCode: 'hr001100',
      dutyCode: null,
    },
    {
      masterId: '1002',
      empNo: 'E1002',
      name: '이영업',
      email: 'partner2@example.com',
      phone: '010-2222-2222',
      deptCode: 'SALES',
      positionCode: 'hr001200',
      dutyCode: null,
    },
  ];
  return { departments, employees, source: 'mock' };
}

/**
 * 오늘(yyyyMMdd) 문자열.
 * @param {Date} [now]
 */
export function yyyymmdd(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

async function fetchDepartmentsFromMssql(pool) {
  const result = await pool.request().query(`
    SELECT
      DEPT_CD   AS deptCode,
      DEPT_NM   AS deptName,
      UP_DEPT   AS upDept,
      LV        AS level,
      BS_CD     AS businessCode
    FROM DEPT_TREE_V
    ORDER BY LV ASC, DEPT_CD ASC
  `);
  return (result.recordset || []).map((r) => ({
    deptCode: String(r.deptCode || '').trim(),
    deptName: String(r.deptName || '').trim() || String(r.deptCode || '').trim(),
    upDept: r.upDept == null || String(r.upDept).trim() === '' ? null : String(r.upDept).trim(),
    level: Number(r.level) || 1,
    businessCode: r.businessCode == null ? null : String(r.businessCode).trim(),
  })).filter((d) => d.deptCode);
}

/**
 * 재직 + 현재 발령 1건 기준 사원.
 * dbo.hr_date_appointment_id 가 없으면 최신 승인 발령으로 폴백.
 */
async function fetchEmployeesFromMssql(pool, asOf = yyyymmdd()) {
  const req = pool.request();
  req.input('asOf', sql.VarChar(8), asOf);
  req.input('workState', sql.VarChar(32), WORK_STATE_ACTIVE);

  let result;
  try {
    result = await req.query(`
      SELECT
        m.hr_employee_master_id AS masterId,
        m.emp_no                AS empNo,
        m.emp_name              AS name,
        i.email                 AS email,
        i.celephone             AS phone,
        a.hr_department_code    AS deptCode,
        a.position_code         AS positionCode,
        a.duty_code             AS dutyCode,
        a.rank_code             AS rankCode
      FROM HR_EMPLOYEE_MASTER m
      INNER JOIN HR_EMPLOYEE_APPOINTMENT a
        ON a.hr_employee_appointment_id = dbo.hr_date_appointment_id(m.hr_employee_master_id, @asOf)
      LEFT JOIN HR_EMPLOYEE_INFO i
        ON i.hr_employee_master_id = m.hr_employee_master_id
      WHERE m.retire_date IS NULL
        AND a.work_state_code = @workState
        AND a.approve_yn = 1
    `);
  } catch (err) {
    // 함수 미존재 등 → 최신 승인 발령 폴백
    console.warn('[partnerOrg] hr_date_appointment_id failed, fallback to latest appointment:', err?.message || err);
    const req2 = pool.request();
    req2.input('workState', sql.VarChar(32), WORK_STATE_ACTIVE);
    result = await req2.query(`
      SELECT
        m.hr_employee_master_id AS masterId,
        m.emp_no                AS empNo,
        m.emp_name              AS name,
        i.email                 AS email,
        i.celephone             AS phone,
        a.hr_department_code    AS deptCode,
        a.position_code         AS positionCode,
        a.duty_code             AS dutyCode,
        a.rank_code             AS rankCode
      FROM HR_EMPLOYEE_MASTER m
      CROSS APPLY (
        SELECT TOP 1 *
        FROM HR_EMPLOYEE_APPOINTMENT ax
        WHERE ax.hr_employee_master_id = m.hr_employee_master_id
          AND ax.approve_yn = 1
        ORDER BY ax.appointment_date DESC, ax.hr_employee_appointment_id DESC
      ) a
      LEFT JOIN HR_EMPLOYEE_INFO i
        ON i.hr_employee_master_id = m.hr_employee_master_id
      WHERE m.retire_date IS NULL
        AND a.work_state_code = @workState
    `);
  }

  return (result.recordset || []).map((r) => {
    const positionCode = r.positionCode == null || String(r.positionCode).trim() === '' ? null : String(r.positionCode).trim();
    const dutyCode = r.dutyCode == null || String(r.dutyCode).trim() === '' ? null : String(r.dutyCode).trim();
    const rankCode = r.rankCode == null || String(r.rankCode).trim() === '' ? null : String(r.rankCode).trim();
    return {
      masterId: String(r.masterId),
      empNo: r.empNo == null ? null : String(r.empNo).trim(),
      name: String(r.name || '').trim() || String(r.empNo || r.masterId),
      email: r.email == null || String(r.email).trim() === '' ? null : String(r.email).trim().toLowerCase(),
      phone: r.phone == null || String(r.phone).trim() === '' ? null : String(r.phone).trim(),
      deptCode: r.deptCode == null || String(r.deptCode).trim() === '' ? null : String(r.deptCode).trim(),
      positionCode,
      dutyCode,
      rankCode,
      jobTitle: null,
    };
  });
}

/**
 * TPA코리아 등 EPS ERP 계열 스키마 (HRA100/HRA150/HRA200).
 * CSIN의 DEPT_TREE_V/HR_EMPLOYEE_* 와는 완전히 다른 테이블 구조라 별도 경로로 둔다.
 *   - HRA200: 부서 마스터 (dept_cd, dept_nm, up_dept, bs_cd)
 *   - HRA100: 직원 마스터 (emp_no, emp_nm, dept_cd, retr_dt == NULL 이면 재직)
 *   - HRA150: 직원 개인정보 (emp_no, email) — 실제론 대부분 비어있어서 이메일이 없으면
 *     emp_no 기반으로 로그인용 가상 이메일을 만들어 쓴다 (PARTNER_SYNTHETIC_EMAIL_DOMAIN).
 * 사업장(bs_cd)으로 회사를 구분하므로 PARTNER_TPA_BS_CD로 어느 사업장 데이터를 쓸지 지정한다.
 */
const SYNTHETIC_EMAIL_DOMAIN = (process.env.PARTNER_SYNTHETIC_EMAIL_DOMAIN || 'tpakorea.local').trim();

async function fetchDepartmentsFromTpaEps(pool, bsCd) {
  const req = pool.request();
  req.input('bsCd', sql.VarChar(20), bsCd);
  const result = await req.query(`
    SELECT dept_cd AS deptCode, dept_nm AS deptName, up_dept AS upDept, bs_cd AS businessCode
    FROM HRA200
    WHERE bs_cd = @bsCd
  `);
  const rows = (result.recordset || []).map((r) => ({
    deptCode: String(r.deptCode || '').trim(),
    deptName: String(r.deptName || '').trim() || String(r.deptCode || '').trim(),
    upDept: r.upDept == null || String(r.upDept).trim() === '' ? null : String(r.upDept).trim(),
    businessCode: r.businessCode == null ? null : String(r.businessCode).trim(),
  })).filter((d) => d.deptCode);

  // HRA200엔 레벨(깊이) 컬럼이 없어서 up_dept 체인을 따라가며 직접 계산한다.
  const byCode = new Map(rows.map((d) => [d.deptCode, d]));
  const levelCache = new Map();
  function levelOf(code, seen = new Set()) {
    if (levelCache.has(code)) return levelCache.get(code);
    const d = byCode.get(code);
    if (!d || !d.upDept || d.upDept === code || seen.has(code)) {
      levelCache.set(code, 1);
      return 1;
    }
    seen.add(code);
    const lv = levelOf(d.upDept, seen) + 1;
    levelCache.set(code, lv);
    return lv;
  }
  return rows.map((d) => ({ ...d, level: levelOf(d.deptCode) }));
}

async function fetchEmployeesFromTpaEps(pool, bsCd) {
  const req = pool.request();
  req.input('bsCd', sql.VarChar(20), bsCd);
  const result = await req.query(`
    SELECT
      a.emp_no    AS empNo,
      a.emp_nm    AS name,
      a.dept_cd   AS deptCode,
      a.duty_bc   AS dutyCode,
      a.rank_bc   AS rankCode,
      b.email     AS email,
      b.mobile    AS phone
    FROM HRA100 a
    LEFT JOIN HRA150 b ON b.emp_no = a.emp_no
    WHERE a.retr_dt IS NULL
      AND a.bs_cd = @bsCd
  `);
  return (result.recordset || []).map((r) => {
    const empNo = String(r.empNo || '').trim();
    const rawEmail = r.email == null ? '' : String(r.email).trim();
    const email = rawEmail ? rawEmail.toLowerCase() : (empNo ? `${empNo}@${SYNTHETIC_EMAIL_DOMAIN}`.toLowerCase() : null);
    return {
      masterId: empNo,
      empNo: empNo || null,
      name: String(r.name || '').trim() || empNo,
      email,
      phone: r.phone == null || String(r.phone).trim() === '' ? null : String(r.phone).trim(),
      deptCode: r.deptCode == null || String(r.deptCode).trim() === '' ? null : String(r.deptCode).trim(),
      positionCode: null,
      dutyCode: r.dutyCode == null || String(r.dutyCode).trim() === '' ? null : String(r.dutyCode).trim(),
      rankCode: r.rankCode == null || String(r.rankCode).trim() === '' ? null : String(r.rankCode).trim(),
      jobTitle: null,
    };
  }).filter((e) => e.empNo);
}

/**
 * @returns {Promise<{ departments: PartnerDept[], employees: PartnerEmployee[], source: string }>}
 */
export async function fetchPartnerOrg() {
  const source = getPartnerOrgSource();
  if (source === 'off') {
    throw new Error('PARTNER_ORG_SOURCE=off');
  }
  if (source === 'mock') {
    return getMockPartnerOrg();
  }

  const schema = (process.env.PARTNER_MSSQL_SCHEMA || 'csin').trim().toLowerCase();
  const pool = await getPartnerPool();

  if (schema === 'tpa_eps') {
    const bsCd = (process.env.PARTNER_TPA_BS_CD || '').trim();
    if (!bsCd) throw new Error('PARTNER_TPA_BS_CD required for PARTNER_MSSQL_SCHEMA=tpa_eps');
    const [departments, employees] = await Promise.all([
      fetchDepartmentsFromTpaEps(pool, bsCd),
      fetchEmployeesFromTpaEps(pool, bsCd),
    ]);
    return { departments, employees, source: 'mssql' };
  }

  const [departments, employees, titleMap] = await Promise.all([
    fetchDepartmentsFromMssql(pool),
    fetchEmployeesFromMssql(pool),
    fetchHrTitleMap(pool),
  ]);
  return {
    departments,
    employees: employees.map((e) => ({
      ...e,
      jobTitle: pickEmployeeJobTitle(e, titleMap),
    })),
    source: 'mssql',
  };
}
