
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import * as schema from "@shared/schema";

let pool: any;
let db: any;

if (!process.env.DATABASE_URL) {
  console.log("Using local persistent PGlite database.");

  // Initialize PGlite with a data directory for persistence
  const client = new PGlite("./.pglite");

  // PGlite client mimics a pool for simple queries
  pool = client;

  // Use PGlite driver for Drizzle
  db = drizzlePglite(client, { schema });

  // Initialize Schema using PGlite
  (async () => {
    try {
      // Execute each table creation separately to isolate any PGlite issues
      const tables = [
        `CREATE TABLE IF NOT EXISTS users (
          id text PRIMARY KEY,
          email text UNIQUE,
          first_name text,
          last_name text,
          profile_image_url text,
          username text UNIQUE,
          password_hash text,
          role text NOT NULL,
          full_name text,
          is_active boolean DEFAULT true,
          team_name text,
          team_lead_id text,
          created_at timestamp DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS leads (
          id SERIAL PRIMARY KEY,
          name text,
          email text,
          phone text,
          location text,
          degree text,
          domain text,
          session_days text,
          walkin_date date,
          walkin_time time,
          timing text,
          current_owner_id text,
          last_owner_id text,
          source_manager_id text,
          status text NOT NULL DEFAULT 'new',
          is_active boolean DEFAULT true,
          notes text,
          year_of_passing text,
          college_name text,
          registration_amount decimal,
          pending_amount decimal,
          partial_amount decimal,
          total_amount decimal DEFAULT '7000.00',
          transaction_number text,
          concession decimal,
          category text,
          program text,
          created_at timestamp DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS lead_history (
          id SERIAL PRIMARY KEY,
          lead_id integer NOT NULL,
          from_user_id text,
          to_user_id text,
          previous_status text,
          new_status text,
          change_reason text,
          change_data jsonb,
          changed_by_user_id text NOT NULL,
          changed_at timestamp DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS uploads (
          id SERIAL PRIMARY KEY,
          uploader_id text NOT NULL,
          file_name text NOT NULL,
          uploaded_at timestamp DEFAULT CURRENT_TIMESTAMP,
          row_count integer,
          processed_count integer,
          failed_count integer,
          status text DEFAULT 'processing',
          errors jsonb
        )`,
        `CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id text NOT NULL,
          title text NOT NULL,
          message text NOT NULL,
          type text NOT NULL,
          image_url text,
          is_read boolean DEFAULT false,
          related_lead_id integer,
          created_at timestamp DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS chat_transcripts (
          id SERIAL PRIMARY KEY,
          hr_user_id text NOT NULL,
          question text NOT NULL,
          answer text NOT NULL,
          category text,
          created_at timestamp DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS productivity_events (
          id SERIAL PRIMARY KEY,
          user_id text NOT NULL,
          event_type text NOT NULL,
          metadata jsonb,
          created_at timestamp DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS sessions (
          sid varchar PRIMARY KEY,
          sess jsonb NOT NULL,
          expire timestamp NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS posts (
          id SERIAL PRIMARY KEY,
          author_id text NOT NULL,
          content text NOT NULL,
          image_url text,
          created_at timestamp DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS post_likes (
          id SERIAL PRIMARY KEY,
          post_id integer NOT NULL,
          user_id text NOT NULL,
          created_at timestamp DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(post_id, user_id)
        )`,
        `CREATE TABLE IF NOT EXISTS post_comments (
          id SERIAL PRIMARY KEY,
          post_id integer NOT NULL,
          user_id text NOT NULL,
          user_name text NOT NULL,
          user_email text NOT NULL,
          comment_text text NOT NULL,
          created_at timestamp DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS classes (
          id SERIAL PRIMARY KEY,
          name text NOT NULL,
          subject text,
          mentor_email text,
          mode text,
          instructor_id text NOT NULL REFERENCES users(id),
          created_at timestamp DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS class_students (
          id SERIAL PRIMARY KEY,
          class_id integer NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
          lead_id integer NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
          student_id text,
          joined_at timestamp DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS post_dislikes (
          id SERIAL PRIMARY KEY,
          post_id integer NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          user_id text NOT NULL,
          created_at timestamp DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS attendance (
          id SERIAL PRIMARY KEY,
          class_id integer NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
          lead_id integer NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
          date date NOT NULL,
          status text NOT NULL,
          created_at timestamp DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS marks (
          id SERIAL PRIMARY KEY,
          class_id integer NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
          lead_id integer NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
          assessment1 integer DEFAULT 0,
          assessment2 integer DEFAULT 0,
          task integer DEFAULT 0,
          project integer DEFAULT 0,
          final_validation integer DEFAULT 0,
          total integer DEFAULT 0,
          created_at timestamp DEFAULT CURRENT_TIMESTAMP,
          updated_at timestamp DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS email_config (
          id SERIAL PRIMARY KEY,
          user_id text UNIQUE REFERENCES users(id),
          smtp_email text NOT NULL,
          app_password text NOT NULL,
          smtp_server text NOT NULL,
          smtp_port integer NOT NULL DEFAULT 587,
          is_enabled boolean DEFAULT true,
          updated_at timestamp DEFAULT CURRENT_TIMESTAMP
        )`
      ];

      for (const tableSql of tables) {
        try {
          await client.exec(tableSql);
        } catch (tableErr) {
          console.error(`Error creating table:`, tableErr);
          // Continue with other tables even if one fails
        }
      }

      console.log("✓ PGlite schema initialized successfully.");
    } catch (err) {
      console.error("Failed to initialize PGlite schema:", err);
      console.log("⚠ Application will continue but database operations may fail.");
    }
  })();

} else {
  console.log("Using remote Neon PostgreSQL database with 'pg' driver.");
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  db = drizzle({ client: pool, schema });
}

export { pool, db };