import "dotenv/config";
import mongoose from "mongoose";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const rollbackIndex = process.argv.indexOf("--rollback");
const rollbackSteps = rollbackIndex === -1 ? null : Number(process.argv[rollbackIndex + 1] ?? 1);

if (args.has("--help")) {
  console.log("Usage: npm run migrate [--dry-run] | npm run migrate:rollback [steps] [--dry-run]");
  process.exit(0);
}

async function main(): Promise<void> {
  const { default: connectDb } = await import("../src/db/connectDb.js");
  const { migrations } = await import("../src/migrations/index.js");
  const { MigrationRunner } = await import("../src/migrations/migrationRunner.js");
  await connectDb();
  if (!mongoose.connection.db) throw new Error("MongoDB connection is not available.");

  const runner = new MigrationRunner(mongoose.connection.db, migrations, {
    before: ({ id, name, dryRun: preview }) => console.log(`[migration] ${preview ? "Previewing" : "Running"} ${id} ${name}`),
    after: ({ id, dryRun: preview }) => console.log(`[migration] ${preview ? "Previewed" : "Completed"} ${id}`),
  });

  try {
    const result = rollbackSteps === null ? await runner.migrate(dryRun) : await runner.rollback(rollbackSteps, dryRun);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

void main();