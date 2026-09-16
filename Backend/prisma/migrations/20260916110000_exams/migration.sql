CREATE TABLE IF NOT EXISTS "exams" (
    "id" SERIAL NOT NULL,
    "candidate_name" TEXT NOT NULL,
    "exam_name" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "center_name" TEXT,
    "exam_date" DATE NOT NULL,
    "exam_time" TEXT NOT NULL,
    "attended" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);
