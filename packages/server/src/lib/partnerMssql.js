/**
 * 거래처 MSSQL 연결.
 * PARTNER_ORG_SOURCE=mssql 일 때만 풀을 만든다.
 */
import sql from 'mssql';

let poolPromise = null;

export function getPartnerOrgSource() {
  const v = (process.env.PARTNER_ORG_SOURCE || 'off').trim().toLowerCase();
  if (v === 'mssql' || v === 'mock' || v === 'off') return v;
  return 'off';
}

export function isPartnerOrgEnabled() {
  const src = getPartnerOrgSource();
  return src === 'mssql' || src === 'mock';
}

function buildConfig() {
  const server = process.env.PARTNER_MSSQL_SERVER || '';
  const database = process.env.PARTNER_MSSQL_DATABASE || '';
  const user = process.env.PARTNER_MSSQL_USER || '';
  const password = process.env.PARTNER_MSSQL_PASSWORD || '';
  const port = Number(process.env.PARTNER_MSSQL_PORT || 1433);
  if (!server || !database || !user) {
    throw new Error('PARTNER_MSSQL_SERVER / DATABASE / USER required');
  }
  const encrypt = String(process.env.PARTNER_MSSQL_ENCRYPT || 'false').toLowerCase() === 'true';
  const trust = String(process.env.PARTNER_MSSQL_TRUST_CERT || 'true').toLowerCase() !== 'false';
  return {
    server,
    port,
    database,
    user,
    password,
    options: {
      encrypt,
      trustServerCertificate: trust,
      enableArithAbort: true,
    },
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    connectionTimeout: Number(process.env.PARTNER_MSSQL_CONNECT_TIMEOUT_MS || 15000),
    requestTimeout: Number(process.env.PARTNER_MSSQL_REQUEST_TIMEOUT_MS || 60000),
  };
}

/** @returns {Promise<import('mssql').ConnectionPool>} */
export async function getPartnerPool() {
  if (getPartnerOrgSource() !== 'mssql') {
    throw new Error('PARTNER_ORG_SOURCE is not mssql');
  }
  if (!poolPromise) {
    poolPromise = sql.connect(buildConfig()).catch((err) => {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

export async function closePartnerPool() {
  if (!poolPromise) return;
  try {
    const pool = await poolPromise;
    await pool.close();
  } catch {
    // ignore
  } finally {
    poolPromise = null;
  }
}

export { sql };
