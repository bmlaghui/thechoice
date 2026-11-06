ALTER TABLE "EventInquiry" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'NEW';
ALTER TABLE "EventInquiry" ADD COLUMN "internalNotes" TEXT;
CREATE INDEX "EventInquiry_status_eventDate_idx" ON "EventInquiry"("status", "eventDate");
