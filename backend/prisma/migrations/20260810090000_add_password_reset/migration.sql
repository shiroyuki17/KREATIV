-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "passwordResetHash" TEXT,
  ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);
