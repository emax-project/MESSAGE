-- 거래처 MSSQL 조직 동기화용 외부 키
ALTER TABLE "Company" ADD COLUMN "externalCode" TEXT;
CREATE UNIQUE INDEX "Company_externalCode_key" ON "Company"("externalCode");

ALTER TABLE "Department" ADD COLUMN "externalCode" TEXT;
CREATE INDEX "Department_externalCode_idx" ON "Department"("externalCode");
CREATE UNIQUE INDEX "Department_companyId_externalCode_key" ON "Department"("companyId", "externalCode");

ALTER TABLE "User" ADD COLUMN "externalEmpId" TEXT;
CREATE UNIQUE INDEX "User_externalEmpId_key" ON "User"("externalEmpId");
