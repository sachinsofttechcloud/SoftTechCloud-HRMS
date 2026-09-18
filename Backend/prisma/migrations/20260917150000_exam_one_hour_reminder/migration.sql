ALTER TABLE "exams"
ADD COLUMN IF NOT EXISTS "one_hour_reminder_sent_at" TIMESTAMP(3);
