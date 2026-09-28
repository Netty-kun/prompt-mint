import { MigrationRunner, type Migration } from "./migrationRunner";

function createDb() {
  const records: Array<{ _id: string; name?: string; appliedAt?: Date }> = [];
  const collection = {
    find: () => ({
      sort: () => ({ toArray: async () => records.map((record) => ({ _id: record._id })) }),
    }),
    insertOne: async (record: (typeof records)[number]) => void records.push(record),
    deleteOne: async ({ _id }: { _id: string }) => void records.splice(records.findIndex((record) => record._id === _id), 1),
  };
  return { records, db: { collection: () => collection } } as never;
}

describe("MigrationRunner", () => {
  it("runs pending migrations in numeric order and tracks versions", async () => {
    const { db, records } = createDb();
    const calls: string[] = [];
    const migrations: Migration[] = [
      { id: "10", name: "second", up: async () => void calls.push("up-10"), down: async () => void calls.push("down-10") },
      { id: "2", name: "first", up: async () => void calls.push("up-2"), down: async () => void calls.push("down-2") },
    ];

    const result = await new MigrationRunner(db, migrations).migrate();

    expect(calls).toEqual(["up-2", "up-10"]);
    expect(records.map((record) => record._id)).toEqual(["2", "10"]);
    expect(result.applied).toEqual(["2", "10"]);
  });

  it("does not mutate data during a dry run and rolls back the latest migration", async () => {
    const { db, records } = createDb();
    records.push({ _id: "1" });
    const calls: string[] = [];
    const migration: Migration = {
      id: "1",
      name: "first",
      up: async () => void calls.push("up"),
      down: async () => void calls.push("down"),
    };
    const runner = new MigrationRunner(db, [migration]);

    await expect(runner.rollback(1, true)).resolves.toMatchObject({ dryRun: true, rolledBack: ["1"] });
    expect(calls).toEqual([]);
    expect(records).toHaveLength(1);
    await runner.rollback();
    expect(calls).toEqual(["down"]);
    expect(records).toHaveLength(0);
  });
});