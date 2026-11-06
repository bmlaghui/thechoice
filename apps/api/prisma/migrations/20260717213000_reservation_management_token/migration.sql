ALTER TABLE "Reservation" ADD COLUMN "managementTokenHash" TEXT;
CREATE UNIQUE INDEX "Reservation_managementTokenHash_key" ON "Reservation"("managementTokenHash");
