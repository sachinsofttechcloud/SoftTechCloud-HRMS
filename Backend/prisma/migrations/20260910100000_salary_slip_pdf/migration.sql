ALTER TABLE "salary_slips"
  ADD COLUMN IF NOT EXISTS "file_data" TEXT,
  ADD COLUMN IF NOT EXISTS "file_name" TEXT;
