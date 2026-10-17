import { prisma } from "./src/lib/prisma.js";

async function run() {
  try {
    const result = await prisma.$queryRaw`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      WHERE conrelid = 'exams'::regclass;
    `;
    console.log(result);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
