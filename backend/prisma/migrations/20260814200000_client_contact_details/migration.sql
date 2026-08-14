-- Онбординг дээр асуудаг байсан ч хаддаг газаргүй байсан хоёр талбар.
ALTER TABLE "ClientProfile" ADD COLUMN "contactRole" TEXT;
ALTER TABLE "ClientProfile" ADD COLUMN "teamSize" TEXT;
