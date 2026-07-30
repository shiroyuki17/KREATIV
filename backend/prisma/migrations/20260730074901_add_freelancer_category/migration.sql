-- AlterTable
ALTER TABLE "FreelancerProfile" ADD COLUMN     "category" TEXT;

-- CreateIndex
CREATE INDEX "FreelancerProfile_category_idx" ON "FreelancerProfile"("category");
