-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "TransactionStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "revisionLimit" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "moderationReason" TEXT,
ADD COLUMN     "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "flagged" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "revisionsUsed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "availableAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneOtpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "phoneOtpHash" TEXT,
ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3);
