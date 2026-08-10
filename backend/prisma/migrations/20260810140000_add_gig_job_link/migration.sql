-- AlterTable
ALTER TABLE "Job" ADD COLUMN "gigId" TEXT;

-- CreateIndex
CREATE INDEX "Job_gigId_idx" ON "Job"("gigId");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "Gig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
