ALTER TABLE "exams"
ADD COLUMN IF NOT EXISTS "technology" TEXT,
ADD COLUMN IF NOT EXISTS "mobile_no" TEXT,
ADD COLUMN IF NOT EXISTS "voucher" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "assist_cost" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "payment_status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "lifecycle_status" TEXT NOT NULL DEFAULT 'SCHEDULED',
ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3);

UPDATE "exams"
SET
  "technology" = COALESCE("technology", 'Not specified'),
  "mobile_no" = COALESCE("mobile_no", 'Not specified'),
  "assist_cost" = CASE
    WHEN "voucher" = false THEN COALESCE("assist_cost", 0)
    ELSE NULL
  END;

ALTER TABLE "exams"
ALTER COLUMN "technology" SET NOT NULL,
ALTER COLUMN "mobile_no" SET NOT NULL;

ALTER TABLE "exams"
ADD CONSTRAINT "exams_payment_status_check"
CHECK ("payment_status" IN ('PENDING', 'COMPLETED')),
ADD CONSTRAINT "exams_lifecycle_status_check"
CHECK ("lifecycle_status" IN ('SCHEDULED', 'CANCELLED')),
ADD CONSTRAINT "exams_voucher_cost_check"
CHECK (
  ("voucher" = true AND "assist_cost" IS NULL)
  OR
  ("voucher" = false AND "assist_cost" IS NOT NULL AND "assist_cost" >= 0)
);
