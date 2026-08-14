-- Холбоо барих хуудсаар ирсэн зурвас. Форм өмнө нь юу ч илгээдэггүй байсан
-- тул хүснэгт хоосон эхэлнэ — нүүлгэн шилжүүлэх өгөгдөл байхгүй.
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportMessage_createdAt_idx" ON "SupportMessage"("createdAt");
