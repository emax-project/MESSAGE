-- AlterTable
ALTER TABLE "Message" ADD COLUMN "contextFilePath" TEXT;
ALTER TABLE "Message" ADD COLUMN "contextLine" INTEGER;
ALTER TABLE "Message" ADD COLUMN "contextBranch" TEXT;
