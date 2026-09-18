CREATE TABLE IF NOT EXISTS "candidates" (
  "id" TEXT NOT NULL,
  "candidate_code" TEXT NOT NULL,
  "full_legal_name" TEXT NOT NULL,
  "mobile_number" TEXT NOT NULL,
  "whatsapp_number" TEXT,
  "email" TEXT,
  "date_of_birth" DATE,
  "address" TEXT,
  "identity_document" TEXT,
  "provider_ids" JSONB,
  "company_name" TEXT,
  "college_name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "candidates_candidate_code_key" ON "candidates"("candidate_code");
CREATE UNIQUE INDEX IF NOT EXISTS "candidates_mobile_number_key" ON "candidates"("mobile_number");
CREATE INDEX IF NOT EXISTS "candidates_email_idx" ON "candidates"("email");

CREATE TABLE IF NOT EXISTS "leads" (
  "id" TEXT NOT NULL,
  "lead_code" TEXT NOT NULL,
  "candidate_id" TEXT,
  "full_name" TEXT NOT NULL,
  "mobile_number" TEXT NOT NULL,
  "whatsapp_number" TEXT NOT NULL,
  "email" TEXT,
  "technology" TEXT NOT NULL,
  "exam_name" TEXT NOT NULL,
  "exam_code" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "preferred_date" DATE NOT NULL,
  "preferred_time" TEXT NOT NULL,
  "voucher_need" BOOLEAN NOT NULL DEFAULT false,
  "quoted_fee" DECIMAL(12,2) NOT NULL,
  "company_reimbursement" BOOLEAN NOT NULL DEFAULT false,
  "company_name" TEXT,
  "source" TEXT NOT NULL,
  "campaign" TEXT,
  "assigned_employee_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "stage" TEXT NOT NULL DEFAULT 'NEW',
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "last_contact_at" TIMESTAMP(3),
  "next_action_at" TIMESTAMP(3) NOT NULL,
  "next_action" TEXT NOT NULL,
  "remarks" TEXT,
  "lost_reason" TEXT,
  "converted_at" TIMESTAMP(3),
  "overdue_escalated_at" TIMESTAMP(3),
  "payment_reminder_sent_at" TIMESTAMP(3),
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "leads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "leads_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "leads_assigned_employee_id_fkey" FOREIGN KEY ("assigned_employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "leads_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "leads_lead_code_key" ON "leads"("lead_code");
CREATE INDEX IF NOT EXISTS "leads_mobile_number_idx" ON "leads"("mobile_number");
CREATE INDEX IF NOT EXISTS "leads_email_idx" ON "leads"("email");
CREATE INDEX IF NOT EXISTS "leads_company_name_idx" ON "leads"("company_name");
CREATE INDEX IF NOT EXISTS "leads_stage_idx" ON "leads"("stage");
CREATE INDEX IF NOT EXISTS "leads_assigned_employee_id_idx" ON "leads"("assigned_employee_id");
CREATE INDEX IF NOT EXISTS "leads_next_action_at_idx" ON "leads"("next_action_at");

CREATE TABLE IF NOT EXISTS "lead_activities" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "user_id" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "details" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "lead_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "lead_activities_lead_id_created_at_idx" ON "lead_activities"("lead_id", "created_at");

ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "candidate_id" TEXT;
CREATE INDEX IF NOT EXISTS "exams_candidate_id_idx" ON "exams"("candidate_id");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exams_candidate_id_fkey'
  ) THEN
    ALTER TABLE "exams"
      ADD CONSTRAINT "exams_candidate_id_fkey"
      FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
