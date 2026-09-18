import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../src/lib/prisma.js";

const columns = await prisma.$queryRawUnsafe(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'exams'
  ORDER BY ordinal_position
`);
console.log("before:", columns.map((row) => row.column_name).join(", "));

await prisma.$executeRawUnsafe(`
  ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP(3)
`);

const after = await prisma.$queryRawUnsafe(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'exams'
  ORDER BY ordinal_position
`);
console.log("after:", after.map((row) => row.column_name).join(", "));
await prisma.$disconnect();
