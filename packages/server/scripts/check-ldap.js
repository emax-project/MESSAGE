#!/usr/bin/env node
/**
 * LDAP 연결 확인
 *   LDAP_ENABLED=true node scripts/check-ldap.js
 *   LDAP_ENABLED=true node scripts/check-ldap.js --uid wtkim
 */
import 'dotenv/config';
import { checkLdapConnection, searchLdapUser } from '../src/lib/ldap.js';

const uidFlag = process.argv.indexOf('--uid');
const uid = uidFlag >= 0 ? process.argv[uidFlag + 1] : '';

try {
  const conn = await checkLdapConnection();
  console.log(JSON.stringify(conn, null, 2));
  if (!conn.ok) process.exitCode = 1;
  if (conn.ok && conn.enabled && uid) {
    const entry = await searchLdapUser(uid);
    console.log(JSON.stringify({ uid, found: !!entry, entry }, null, 2));
    if (!entry) process.exitCode = 1;
  }
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}
