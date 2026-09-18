import dotenv from "dotenv";
dotenv.config();
import { prisma } from "../src/lib/prisma.js";

const updated = await prisma.$executeRaw`
  UPDATE exams
  SET reminder_sent_at = NULL, updated_at = CURRENT_TIMESTAMP
  WHERE reminder_sent_at IS NOT NULL
`;
console.log("cleared reminder flags:", updated);
await prisma.$disconnect();
