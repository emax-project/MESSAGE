-- 내선번호·상태 메시지(자유 텍스트)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "extension" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "statusNote" TEXT;
