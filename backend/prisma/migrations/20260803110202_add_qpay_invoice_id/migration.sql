-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "qpayInvoiceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_qpayInvoiceId_key" ON "Transaction"("qpayInvoiceId");
