import { PGlite } from '@electric-sql/pglite';

async function run() {
  console.log("Checking PGlite users...");
  const client = new PGlite("./.pglite");
  try {
    const res = await client.query("SELECT id, username, role, password_hash FROM users");
    console.log("Total users:", res.rows.length);
    console.log("Users:", res.rows);
  } catch (e) {
    console.error("Error reading users:", e);
  }
}

run();
