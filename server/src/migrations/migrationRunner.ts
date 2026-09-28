import type { Db } from "mongodb";

export interface MigrationContext {
  db: Db;
  id: string;
  name: string;
  dryRun: boolean;
}

export interface Migration {
  id: string;
  name: string;
  up(context: MigrationContext): Promise<void>;
  down(context: MigrationContext): Promise<void>;
}

export interface MigrationHooks {
  before?: (migration: MigrationContext) => Promise<void> | void;
  after?: (migration: MigrationContext) => Promise<void> | void;
}

export interface MigrationResult {
  applied: string[];
  rolledBack: string[];
  pending: string[];
  dryRun: boolean;
}

const MIGRATION_COLLECTION = "_migrations";
type MigrationRecord = { _id: string; name: string; appliedAt: Date };

function sortMigrations(migrations: Migration[]): Migration[] {
  const sorted = [...migrations].sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true }));
  const ids = new Set<string>();
  for (const migration of sorted) {
    if (!migration.id || ids.has(migration.id)) throw new Error(`Duplicate migration id: ${migration.id}`);
    ids.add(migration.id);
  }
  return sorted;
}

export class MigrationRunner {
  private readonly migrations: Migration[];
  private readonly hooks: MigrationHooks;

  constructor(private readonly db: Db, migrations: Migration[], hooks: MigrationHooks = {}) {
    this.migrations = sortMigrations(migrations);
    this.hooks = hooks;
  }

  private migrationCollection() {
    return this.db.collection<MigrationRecord>(MIGRATION_COLLECTION);
  }

  async getAppliedIds(): Promise<string[]> {
    const records = await this.migrationCollection()
      .find({}, { projection: { _id: 1 } })
      .sort({ _id: 1 })
      .toArray();
    return records.map((record) => String(record._id));
  }

  async migrate(dryRun = false): Promise<MigrationResult> {
    const applied = new Set(await this.getAppliedIds());
    const pending = this.migrations.filter((migration) => !applied.has(migration.id));
    const appliedIds: string[] = [];

    for (const migration of pending) {
      const context = { db: this.db, id: migration.id, name: migration.name, dryRun };
      await this.hooks.before?.(context);
      if (!dryRun) {
        await migration.up(context);
        await this.migrationCollection().insertOne({
          _id: migration.id,
          name: migration.name,
          appliedAt: new Date(),
        });
      }
      await this.hooks.after?.(context);
      appliedIds.push(migration.id);
    }

    return { applied: appliedIds, rolledBack: [], pending: pending.map((migration) => migration.id), dryRun };
  }

  async rollback(steps = 1, dryRun = false): Promise<MigrationResult> {
    if (!Number.isInteger(steps) || steps < 1) throw new Error("Rollback steps must be a positive integer.");

    const appliedIds = await this.getAppliedIds();
    const known = new Map(this.migrations.map((migration) => [migration.id, migration]));
    const rollbackIds = appliedIds.slice(-steps).reverse();
    const rolledBack: string[] = [];

    for (const id of rollbackIds) {
      const migration = known.get(id);
      if (!migration) throw new Error(`Applied migration is not registered: ${id}`);
      const context = { db: this.db, id: migration.id, name: migration.name, dryRun };
      await this.hooks.before?.(context);
      if (!dryRun) {
        await migration.down(context);
        await this.migrationCollection().deleteOne({ _id: migration.id });
      }
      await this.hooks.after?.(context);
      rolledBack.push(id);
    }

    return { applied: [], rolledBack, pending: [], dryRun };
  }
}

export { MIGRATION_COLLECTION };