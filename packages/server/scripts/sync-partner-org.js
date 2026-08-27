#!/usr/bin/env node
/**
 * 거래처 조직 동기화 CLI
 *   PARTNER_ORG_SOURCE=mock node scripts/sync-partner-org.js
 *   PARTNER_ORG_SOURCE=mssql node scripts/sync-partner-org.js
 *   node scripts/sync-partner-org.js --dry-run
 *   node scripts/sync-partner-org.js --create-users
 *   node scripts/sync-partner-org.js --create-users --dry-run
 */
import 'dotenv/config';
import { syncPartnerOrg } from '../src/lib/syncPartnerOrg.js';
import { closePartnerPool } from '../src/lib/partnerMssql.js';

const dryRun = process.argv.includes('--dry-run');
const createMissingUsers = process.argv.includes('--create-users');

try {
  const result = await syncPartnerOrg({ dryRun, createMissingUsers });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await closePartnerPool();
  const { prisma } = await import('../src/db.js');
  await prisma.$disconnect();
}
