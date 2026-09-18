ALTER TABLE "exams"
  ADD COLUMN IF NOT EXISTS "document_status" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "confirmation_status" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "voucher_status" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "voucher_expiry_at" DATE;

CREATE TABLE IF NOT EXISTS "lead_payment_actions" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "amount_due" DECIMAL(12,2) NOT NULL,
  "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "commitment_date" DATE,
  "channel" TEXT NOT NULL DEFAULT 'Direct',
  "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
  "reimbursement_status" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_payment_actions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lead_payment_actions_lead_id_fkey" FOREIGN KEY ("lead_id")
    REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "lead_payment_actions_lead_id_key"
  ON "lead_payment_actions"("lead_id");
CREATE INDEX IF NOT EXISTS "lead_payment_actions_commitment_date_idx"
  ON "lead_payment_actions"("commitment_date");

CREATE TABLE IF NOT EXISTS "dashboard_maintenance" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "due" DATE NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dashboard_maintenance_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "dashboard_maintenance_due_idx"
  ON "dashboard_maintenance"("due");

CREATE TABLE IF NOT EXISTS "dashboard_reminders" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dashboard_reminders_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "dashboard_reminders_date_idx"
  ON "dashboard_reminders"("date");

CREATE TABLE IF NOT EXISTS "support_cases" (
  "id" TEXT NOT NULL,
  "case_code" TEXT NOT NULL,
  "candidate_name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "opened" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "owner" TEXT NOT NULL,
  "lead_id" TEXT,
  "exam_id" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_cases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "support_cases_lead_id_fkey" FOREIGN KEY ("lead_id")
    REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "support_cases_exam_id_fkey" FOREIGN KEY ("exam_id")
    REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "support_cases_case_code_key"
  ON "support_cases"("case_code");
CREATE INDEX IF NOT EXISTS "support_cases_lead_id_idx" ON "support_cases"("lead_id");
CREATE INDEX IF NOT EXISTS "support_cases_exam_id_idx" ON "support_cases"("exam_id");
CREATE INDEX IF NOT EXISTS "support_cases_status_idx" ON "support_cases"("status");

CREATE TABLE IF NOT EXISTS "monthly_revenue" (
  "id" TEXT NOT NULL,
  "month" DATE NOT NULL,
  "support_cost_actual" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "voucher_cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "support_setup_cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "monthly_revenue_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "monthly_revenue_month_key"
  ON "monthly_revenue"("month");
