#!/usr/bin/env node
/**
 * 거래처 조직 동기화 CLI
 *   PARTNER_ORG_SOURCE=mock node scripts/sync-partner-org.js
 *   PARTNER_ORG_SOURCE=mssql node scripts/sync-partner-org.js
 *   node scripts/sync-partner-org.js --dry-run
 */
import 'dotenv/config';
import { syncPartnerOrg } from '../src/lib/syncPartnerOrg.js';
import { closePartnerPool } from '../src/lib/partnerMssql.js';

const dryRun = process.argv.includes('--dry-run');

try {
  const result = await syncPartnerOrg({ dryRun });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await closePartnerPool();
  // prisma 프로세스 종료
  const { prisma } = await import('../src/db.js');
  await prisma.$disconnect();
}
