-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('OPEN', 'BUSY', 'CLOSED');

-- AlterTable
ALTER TABLE "FreelancerProfile" ADD COLUMN "availability" "Availability" NOT NULL DEFAULT 'OPEN';
