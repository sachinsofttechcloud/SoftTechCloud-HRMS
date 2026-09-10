ALTER TABLE "compensations"
  ADD COLUMN IF NOT EXISTS "employee_id" TEXT;

UPDATE "compensations" AS c
SET "employee_id" = u."employee_id"
FROM "users" AS u
WHERE c."userId" = u."id"
  AND c."employee_id" IS DISTINCT FROM u."employee_id";

CREATE INDEX IF NOT EXISTS "compensations_employee_id_idx"
  ON "compensations" ("employee_id");
