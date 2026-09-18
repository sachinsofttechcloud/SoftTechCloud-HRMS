ALTER TABLE "exams"
  ADD COLUMN IF NOT EXISTS "seven_day_reminder_sent_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "three_day_reminder_sent_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "two_hour_reminder_sent_at" TIMESTAMP(3);
