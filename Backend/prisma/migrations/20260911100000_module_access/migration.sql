CREATE TABLE IF NOT EXISTS "app_modules" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "route" TEXT,
  "group_name" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "user_module_access" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "module_id" TEXT NOT NULL,
  "can_access" BOOLEAN NOT NULL DEFAULT TRUE,
  "granted_by_id" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "user_module_access_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_module_access_module_id_fkey"
    FOREIGN KEY ("module_id") REFERENCES "app_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_module_access_granted_by_id_fkey"
    FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_module_access_user_id_module_id_key"
  ON "user_module_access" ("user_id", "module_id");

CREATE INDEX IF NOT EXISTS "user_module_access_user_id_idx"
  ON "user_module_access" ("user_id");

CREATE INDEX IF NOT EXISTS "user_module_access_module_id_idx"
  ON "user_module_access" ("module_id");
