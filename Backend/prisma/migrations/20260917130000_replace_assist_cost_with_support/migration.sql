ALTER TABLE "exams"
DROP CONSTRAINT IF EXISTS "exams_voucher_cost_check";

ALTER TABLE "exams"
ADD COLUMN IF NOT EXISTS "assist_support" BOOLEAN NOT NULL DEFAULT true;

UPDATE "exams"
SET "assist_support" = NOT "voucher";

ALTER TABLE "exams"
DROP COLUMN IF EXISTS "assist_cost";

ALTER TABLE "exams"
ADD CONSTRAINT "exams_voucher_assist_support_check"
CHECK (
  ("voucher" = true AND "assist_support" = false)
  OR
  ("voucher" = false AND "assist_support" = true)
);
