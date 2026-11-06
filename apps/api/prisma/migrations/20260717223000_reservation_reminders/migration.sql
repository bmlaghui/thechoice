ALTER TABLE "Reservation" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
CREATE INDEX "Reservation_status_reminderSentAt_idx" ON "Reservation"("status", "reminderSentAt");
