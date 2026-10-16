import dotenv from "dotenv";
dotenv.config();
import { prisma } from "../src/lib/prisma.js";

async function run() {
  console.log("Applying exam database updates...");
  
  // 1. Add case_reason column to exams table if not exists
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "exams"
    ADD COLUMN IF NOT EXISTS "case_reason" TEXT;
  `);
  console.log("Added case_reason column to exams (if not existed).");

  // 2. Create exam_catalog table if not exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "exam_catalog" (
      "id" SERIAL PRIMARY KEY,
      "exam_code" TEXT UNIQUE NOT NULL,
      "exam_name" TEXT NOT NULL,
      "technology" TEXT NOT NULL,
      "provider" TEXT,
      "duration" TEXT,
      "exam_fee" NUMERIC(10,2),
      "description" TEXT,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("Created exam_catalog table (if not existed).");

  // Seed sample certification exams if catalog is empty
  const countRes = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "exam_catalog"`);
  const count = countRes[0]?.count || 0;
  console.log("Current exam_catalog count:", count);

  if (count === 0) {
    console.log("Seeding initial exam catalog entries...");
    const sampleExams = [
      {
        code: "SAA-C03",
        name: "AWS Certified Solutions Architect - Associate",
        tech: "Cloud / AWS",
        provider: "Amazon Web Services",
        duration: "130 mins",
        fee: 150.00,
        desc: "Validates ability to design and implement distributed systems on AWS."
      },
      {
        code: "AZ-900",
        name: "Microsoft Certified: Azure Fundamentals",
        tech: "Cloud / Azure",
        provider: "Microsoft",
        duration: "60 mins",
        fee: 99.00,
        desc: "Demonstrates foundational knowledge of cloud services and Microsoft Azure."
      },
      {
        code: "AZ-104",
        name: "Microsoft Azure Administrator",
        tech: "Cloud / Azure",
        provider: "Microsoft",
        duration: "120 mins",
        fee: 165.00,
        desc: "Validates skills in implementing, managing, and monitoring identity and computing in Azure."
      },
      {
        code: "CCNA-200-301",
        name: "Cisco Certified Network Associate (CCNA)",
        tech: "Networking",
        provider: "Cisco",
        duration: "120 mins",
        fee: 300.00,
        desc: "Covers network fundamentals, IP services, security, automation, and programmability."
      },
      {
        code: "RHCSA-EX200",
        name: "Red Hat Certified System Administrator (RHCSA)",
        tech: "Linux / RedHat",
        provider: "Red Hat",
        duration: "180 mins",
        fee: 400.00,
        desc: "Core domain system administration skills across Red Hat Enterprise Linux environments."
      },
      {
        code: "CKA",
        name: "Certified Kubernetes Administrator",
        tech: "DevOps / Kubernetes",
        provider: "Cloud Native Computing Foundation (CNCF)",
        duration: "120 mins",
        fee: 395.00,
        desc: "Skills, knowledge, and competency to perform responsibilities of Kubernetes administrators."
      },
      {
        code: "SEC-PLUS-SY0-701",
        name: "CompTIA Security+",
        tech: "Cybersecurity",
        provider: "CompTIA",
        duration: "90 mins",
        fee: 392.00,
        desc: "Baseline cybersecurity skills assessing threats, attacks, vulnerabilities, and architecture."
      },
      {
        code: "GCP-PCA",
        name: "Google Professional Cloud Architect",
        tech: "Cloud / GCP",
        provider: "Google Cloud",
        duration: "120 mins",
        fee: 200.00,
        desc: "Enables organizations to leverage Google Cloud technologies safely and effectively."
      }
    ];

    for (const item of sampleExams) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "exam_catalog" ("exam_code", "exam_name", "technology", "provider", "duration", "exam_fee", "description")
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT ("exam_code") DO NOTHING
      `, item.code, item.name, item.tech, item.provider, item.duration, item.fee, item.desc);
    }
    console.log("Seeded sample exams.");
  }

  // Check columns in exams
  const examCols = await prisma.$queryRawUnsafe(`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'exams'
  `);
  console.log("exams columns:", examCols.map(c => c.column_name).join(", "));

  await prisma.$disconnect();
  console.log("Database update completed successfully.");
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
