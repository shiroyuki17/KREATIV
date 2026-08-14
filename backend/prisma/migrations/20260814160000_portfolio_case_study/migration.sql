-- AlterTable
ALTER TABLE "PortfolioItem" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PortfolioItem" ADD COLUMN "coverIndex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PortfolioItem" ADD COLUMN "embedUrl" TEXT;
ALTER TABLE "PortfolioItem" ADD COLUMN "outcome" TEXT;
