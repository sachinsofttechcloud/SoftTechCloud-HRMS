UPDATE "app_modules"
SET
  "is_active" = FALSE,
  "updated_at" = NOW()
WHERE "key" NOT IN (
  'dashboard',
  'attendance',
  'onboarding',
  'manage_users'
);

UPDATE "app_modules"
SET
  "label" = 'Attendance & HRMS',
  "description" = 'Attendance, leave, calendar, compensation, HR documents, and payroll submodules',
  "sort_order" = 20,
  "updated_at" = NOW()
WHERE "key" = 'attendance';
