-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NONE', 'PENDING', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "FreelancerProfile"
  ADD COLUMN "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "verificationEvidence" TEXT,
  ADD COLUMN "verificationNote" TEXT,
  ADD COLUMN "verificationRequestedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedAt" TIMESTAMP(3);
