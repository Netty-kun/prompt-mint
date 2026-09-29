# MongoDB Migrations

The server migration runner applies versioned MongoDB changes in numeric order
and records completed migrations in the `_migrations` collection. Migration IDs
are strings, but should use a sortable numeric prefix such as `001` or `002`.

## Add a migration

Create a file in `server/src/migrations/` implementing the `Migration` contract:

```ts
import type { Migration } from "./migrationRunner";

export const addPromptIndex: Migration = {
  id: "001",
  name: "add prompt owner index",
  async up({ db }) {
    await db.collection("prompts").createIndex({ owner: 1 });
  },
  async down({ db }) {
    await db.collection("prompts").dropIndex("owner_1");
  },
};
```

Register the migration in `server/src/migrations/index.ts`. Migrations should be
safe to run once, and their `down` operation should reverse the corresponding
`up` operation.

## Commands

Run from `server/`:

```bash
npm run migrate
npm run migrate:dry-run
npm run migrate:rollback -- 1
npm run migrate:rollback -- 1 --dry-run
```

The dry-run mode executes hooks and reports planned work but does not call
migration `up` or `down` functions and does not modify `_migrations`. The CLI
provides pre- and post-migration hooks for consistent operational logging.

Set `MONGODB_URI` before running commands. Test or staging environments should
use their own database URI before applying or rolling back migrations.