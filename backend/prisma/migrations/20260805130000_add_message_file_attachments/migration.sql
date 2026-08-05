-- AlterTable
ALTER TABLE "Message" ALTER COLUMN "text" SET DEFAULT '';
ALTER TABLE "Message" ADD COLUMN "fileUrl" TEXT;
ALTER TABLE "Message" ADD COLUMN "fileName" TEXT;
ALTER TABLE "Message" ADD COLUMN "fileType" TEXT;
ALTER TABLE "Message" ADD COLUMN "fileSize" INTEGER;
