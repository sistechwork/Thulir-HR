import { PGlite } from '@electric-sql/pglite';

async function run() {
  const client = new PGlite("./.pglite");
  try {
    await client.exec("ALTER TABLE leads ADD COLUMN last_owner_id text;");
    console.log("Migration successful: added last_owner_id to leads");
  } catch (e) {
    console.error("Migration failed (column might already exist):", e);
  }
}

run();
