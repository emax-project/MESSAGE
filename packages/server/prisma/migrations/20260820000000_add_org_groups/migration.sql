-- CreateTable
CREATE TABLE IF NOT EXISTS "OrgGroup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OrgGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "memberUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrgGroup_userId_idx" ON "OrgGroup"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrgGroupMember_groupId_idx" ON "OrgGroupMember"("groupId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrgGroupMember_memberUserId_idx" ON "OrgGroupMember"("memberUserId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OrgGroupMember_groupId_memberUserId_key" ON "OrgGroupMember"("groupId", "memberUserId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "OrgGroup" ADD CONSTRAINT "OrgGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OrgGroupMember" ADD CONSTRAINT "OrgGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OrgGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OrgGroupMember" ADD CONSTRAINT "OrgGroupMember_memberUserId_fkey" FOREIGN KEY ("memberUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
