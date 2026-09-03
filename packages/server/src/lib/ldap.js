/**
 * Synology LDAP Server (OpenLDAP) 연동.
 * 거래처 회신 기준: ldap.csin.kr:636 / uid / shadowExpire 필터 / 관리자·외부는 로컬 예외.
 */
import { Client, Attribute, Change } from 'ldapts';

const DEFAULT_URL = 'ldaps://ldap.csin.kr:636';
const DEFAULT_BASE_DN = 'dc=ldap,dc=csin,dc=kr';
const DEFAULT_SEARCH_BASE = 'cn=users,dc=ldap,dc=csin,dc=kr';
const DEFAULT_SEARCH_FILTER = '(&(objectClass=posixAccount)(uid=%s)(!(shadowExpire=1)))';
const DEFAULT_EMAIL_DOMAIN = 'csin.kr';

export function isLdapEnabled() {
  return String(process.env.LDAP_ENABLED || '').trim().toLowerCase() === 'true';
}

export function getLdapEmailDomain() {
  return (process.env.LDAP_EMAIL_DOMAIN || DEFAULT_EMAIL_DOMAIN).trim().toLowerCase() || DEFAULT_EMAIL_DOMAIN;
}

/** RFC 4515 필터 값 이스케이프 */
export function escapeLdapFilterValue(value) {
  return String(value).replace(/[\\*\(\)\0]/g, (ch) => {
    if (ch === '\\') return '\\5c';
    if (ch === '*') return '\\2a';
    if (ch === '(') return '\\28';
    if (ch === ')') return '\\29';
    return '\\00';
  });
}

export function buildUserSearchFilter(uid, template) {
  const raw = (template || process.env.LDAP_SEARCH_FILTER || DEFAULT_SEARCH_FILTER).trim() || DEFAULT_SEARCH_FILTER;
  return raw.replace(/%s/g, escapeLdapFilterValue(uid));
}

/** wtkim@csin.kr, wtkim → wtkim */
export function loginIdentifierToUid(identifier) {
  const raw = String(identifier || '').trim();
  if (!raw) return '';
  const at = raw.indexOf('@');
  return at === -1 ? raw : raw.slice(0, at);
}

export function isPwdResetTrue(value) {
  if (value == null) return false;
  const v = Array.isArray(value) ? value[0] : value;
  return /^(true|1)$/i.test(String(v).trim());
}

export function getLocalExceptionEmails() {
  const split = (s) =>
    String(s || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  return new Set([...split(process.env.LDAP_LOCAL_EXCEPTIONS), ...split(process.env.ADMIN_EMAIL)]);
}

export function isLocalExceptionEmail(email) {
  return getLocalExceptionEmails().has(String(email || '').trim().toLowerCase());
}

export function getLdapConfig() {
  const enabled = isLdapEnabled();
  const url = (process.env.LDAP_URL || DEFAULT_URL).trim() || DEFAULT_URL;
  const bindDn = (process.env.LDAP_BIND_DN || '').trim();
  const bindPassword = process.env.LDAP_BIND_PASSWORD || '';
  const baseDn = (process.env.LDAP_BASE_DN || DEFAULT_BASE_DN).trim() || DEFAULT_BASE_DN;
  const searchBase = (process.env.LDAP_SEARCH_BASE || DEFAULT_SEARCH_BASE).trim() || DEFAULT_SEARCH_BASE;
  const searchFilter = (process.env.LDAP_SEARCH_FILTER || DEFAULT_SEARCH_FILTER).trim() || DEFAULT_SEARCH_FILTER;
  const emailDomain = getLdapEmailDomain();
  const timeout = Number(process.env.LDAP_TIMEOUT_MS || 10000);
  const connectTimeout = Number(process.env.LDAP_CONNECT_TIMEOUT_MS || 8000);
  const tlsRejectUnauthorized = String(process.env.LDAP_TLS_REJECT_UNAUTHORIZED || 'true').toLowerCase() !== 'false';
  return {
    enabled,
    url,
    bindDn,
    bindPassword,
    baseDn,
    searchBase,
    searchFilter,
    emailDomain,
    timeout: Number.isFinite(timeout) ? timeout : 10000,
    connectTimeout: Number.isFinite(connectTimeout) ? connectTimeout : 8000,
    tlsRejectUnauthorized,
  };
}

export function assertLdapConfigured() {
  const cfg = getLdapConfig();
  if (!cfg.enabled) return cfg;
  if (!cfg.url || !cfg.bindDn || !cfg.bindPassword || !cfg.searchBase) {
    const err = new Error('LDAP_NOT_CONFIGURED');
    err.status = 503;
    throw err;
  }
  return cfg;
}

function createClient(cfg) {
  return new Client({
    url: cfg.url,
    timeout: cfg.timeout,
    connectTimeout: cfg.connectTimeout,
    tlsOptions: { rejectUnauthorized: cfg.tlsRejectUnauthorized },
  });
}

async function withClient(fn) {
  const cfg = assertLdapConfigured();
  const client = createClient(cfg);
  try {
    return await fn(client, cfg);
  } finally {
    try {
      await client.unbind();
    } catch {
      /* ignore */
    }
  }
}

function firstAttr(entry, name) {
  if (!entry) return '';
  const raw = entry[name] ?? entry[name.toLowerCase()];
  if (raw == null) return '';
  return String(Array.isArray(raw) ? raw[0] : raw);
}

export function mapLdapError(err) {
  const name = err?.name || '';
  const code = err?.code;
  const msg = String(err?.message || '');
  if (name === 'InvalidCredentialsError' || code === 49) return 'INVALID_CREDENTIALS';
  if (/account.?lock|locked|too many|intruder/i.test(msg)) return 'ACCOUNT_LOCKED';
  if (name === 'ConstraintViolationError' || code === 19) {
    if (/password|pwd/i.test(msg)) return 'PASSWORD_POLICY';
    return 'LDAP_CONSTRAINT';
  }
  if (
    name === 'ConnectionError' ||
    name === 'TimeoutError' ||
    /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EHOSTUNREACH|certificate|handshake/i.test(msg)
  ) {
    return 'LDAP_UNAVAILABLE';
  }
  return 'LDAP_ERROR';
}

function ldapFail(code, status = 401) {
  const err = new Error(code);
  err.status = status;
  err.ldapCode = code;
  return err;
}

/**
 * @returns {Promise<{ dn: string, uid: string, pwdReset: boolean, employeeNumber: string | null } | null>}
 */
export async function searchLdapUser(uid) {
  const safeUid = String(uid || '').trim();
  if (!safeUid) return null;
  return withClient(async (client, cfg) => {
    try {
      await client.bind(cfg.bindDn, cfg.bindPassword);
    } catch (err) {
      console.error('[ldap] service bind failed:', mapLdapError(err));
      throw ldapFail('LDAP_UNAVAILABLE', 503);
    }
    const { searchEntries } = await client.search(cfg.searchBase, {
      scope: 'sub',
      filter: buildUserSearchFilter(safeUid, cfg.searchFilter),
      attributes: ['dn', 'uid', 'mail', 'cn', 'employeeNumber', 'pwdReset', 'shadowExpire'],
      sizeLimit: 2,
    });
    const entry = searchEntries?.[0];
    if (!entry) return null;
    return {
      dn: String(entry.dn || ''),
      uid: firstAttr(entry, 'uid') || safeUid,
      pwdReset: isPwdResetTrue(entry.pwdReset),
      employeeNumber: firstAttr(entry, 'employeeNumber') || null,
    };
  });
}

/**
 * 검색 필터로 활성 계정을 찾은 뒤 사용자 DN으로 bind 한다.
 * bind 자체는 비활성 계정에서도 성공할 수 있어 검색을 반드시 먼저 한다.
 */
export async function authenticateLdap(uid, password) {
  let entry;
  try {
    entry = await searchLdapUser(uid);
  } catch (err) {
    throw ldapFail(mapLdapError(err), mapLdapError(err) === 'LDAP_UNAVAILABLE' ? 503 : 500);
  }
  if (!entry?.dn) return { ok: false, reason: 'NOT_FOUND' };

  const cfg = assertLdapConfigured();
  const userClient = createClient(cfg);
  try {
    await userClient.bind(entry.dn, password);
  } catch (err) {
    const mapped = mapLdapError(err);
    if (mapped === 'INVALID_CREDENTIALS' || mapped === 'ACCOUNT_LOCKED') {
      return { ok: false, reason: mapped };
    }
    throw ldapFail(mapped, mapped === 'LDAP_UNAVAILABLE' ? 503 : 500);
  } finally {
    try {
      await userClient.unbind();
    } catch {
      /* ignore */
    }
  }

  return {
    ok: true,
    dn: entry.dn,
    uid: entry.uid,
    mustChangePassword: entry.pwdReset,
    employeeNumber: entry.employeeNumber,
  };
}

async function modifyPassword(client, dn, newPassword) {
  await client.modify(
    dn,
    new Change({
      operation: 'replace',
      modification: new Attribute({ type: 'userPassword', values: [newPassword] }),
    }),
  );
}

async function trySetPwdReset(client, dn, value) {
  try {
    await client.modify(
      dn,
      new Change({
        operation: 'replace',
        modification: new Attribute({ type: 'pwdReset', values: [value] }),
      }),
    );
  } catch (err) {
    console.warn(`[ldap] pwdReset=${value} 설정 실패:`, err?.message);
  }
}

/** 서비스 계정으로 비밀번호를 바꾼다. Directory Operators 권한 필요. */
export async function resetLdapPassword(uid, newPassword, { forceChange = true } = {}) {
  const entry = await searchLdapUser(uid);
  if (!entry?.dn) throw ldapFail('LDAP_USER_NOT_FOUND', 400);
  try {
    await withClient(async (client, cfg) => {
      await client.bind(cfg.bindDn, cfg.bindPassword);
      await modifyPassword(client, entry.dn, newPassword);
      await trySetPwdReset(client, entry.dn, forceChange ? 'TRUE' : 'FALSE');
    });
  } catch (err) {
    if (err.ldapCode || err.status) throw err;
    const mapped = mapLdapError(err);
    throw ldapFail(mapped === 'PASSWORD_POLICY' ? 'PASSWORD_POLICY' : mapped, mapped === 'PASSWORD_POLICY' ? 400 : 503);
  }
  return { ok: true, dn: entry.dn };
}

/** 현재 비밀번호로 LDAP bind 한 뒤 서비스 계정으로 변경한다. */
export async function changeLdapPassword(uid, currentPassword, newPassword) {
  const auth = await authenticateLdap(uid, currentPassword);
  if (!auth.ok) {
    if (auth.reason === 'INVALID_CREDENTIALS') throw ldapFail('CURRENT_PASSWORD_MISMATCH', 400);
    if (auth.reason === 'ACCOUNT_LOCKED') throw ldapFail('ACCOUNT_LOCKED', 423);
    throw ldapFail('LDAP_USER_NOT_FOUND', 400);
  }
  await resetLdapPassword(uid, newPassword, { forceChange: false });
  return { ok: true };
}

/** Bind 계정으로 연결만 확인 (헬스/CLI). 비밀번호는 로그에 남기지 않는다. */
export async function checkLdapConnection() {
  if (!isLdapEnabled()) {
    return { ok: true, enabled: false };
  }
  try {
    const cfg = assertLdapConfigured();
    await withClient(async (client) => {
      await client.bind(cfg.bindDn, cfg.bindPassword);
    });
    return { ok: true, enabled: true, bound: true, url: cfg.url, searchBase: cfg.searchBase };
  } catch (err) {
    return {
      ok: false,
      enabled: true,
      bound: false,
      error: err?.message === 'LDAP_NOT_CONFIGURED' ? 'LDAP_NOT_CONFIGURED' : mapLdapError(err),
    };
  }
}
