import './load-env';
import { db } from '@vercel/postgres';

async function migrate() {
  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL is required');
    process.exit(1);
  }

  const client = await db.connect();

  try {
    await client.sql`
      CREATE TABLE IF NOT EXISTS courses (
        course_id TEXT,
        academic_level TEXT,
        translated_level TEXT,
        passed_catalog_query TEXT,
        start_date TEXT,
        online_offering BOOLEAN,
        campus_offering BOOLEAN,
        pid TEXT PRIMARY KEY,
        course_uuid TEXT,
        title TEXT,
        subject_code TEXT,
        subject_description TEXT,
        translated_subject TEXT,
        subject_id TEXT,
        activation_date TEXT,
        score REAL
      );
    `;

    await client.sql`
      CREATE TABLE IF NOT EXISTS courses_data (
        pid TEXT PRIMARY KEY,
        title TEXT,
        catalog_course_id TEXT,
        description TEXT,
        academic_level TEXT,
        credits REAL,
        date_start TEXT,
        online_offering BOOLEAN,
        campus_offering BOOLEAN,
        subject_code TEXT
      );
    `;

    await client.sql`
      CREATE TABLE IF NOT EXISTS prerequisites (
        class_id TEXT,
        course_id TEXT,
        course_title TEXT,
        course_credits TEXT,
        PRIMARY KEY (class_id, course_id),
        FOREIGN KEY (class_id) REFERENCES courses_data (pid) ON DELETE CASCADE
      );
    `;

    await client.sql`
      CREATE TABLE IF NOT EXISTS courses_stage (
        course_id TEXT,
        academic_level TEXT,
        translated_level TEXT,
        passed_catalog_query TEXT,
        start_date TEXT,
        online_offering BOOLEAN,
        campus_offering BOOLEAN,
        pid TEXT PRIMARY KEY,
        course_uuid TEXT,
        title TEXT,
        subject_code TEXT,
        subject_description TEXT,
        translated_subject TEXT,
        subject_id TEXT,
        activation_date TEXT,
        score REAL
      );
    `;

    await client.sql`
      CREATE TABLE IF NOT EXISTS courses_data_stage (
        pid TEXT PRIMARY KEY,
        title TEXT,
        catalog_course_id TEXT,
        description TEXT,
        academic_level TEXT,
        credits REAL,
        date_start TEXT,
        online_offering BOOLEAN,
        campus_offering BOOLEAN,
        subject_code TEXT
      );
    `;

    await client.sql`
      CREATE TABLE IF NOT EXISTS prerequisites_stage (
        class_id TEXT,
        course_id TEXT,
        course_title TEXT,
        course_credits TEXT,
        PRIMARY KEY (class_id, course_id),
        FOREIGN KEY (class_id) REFERENCES courses_data_stage (pid) ON DELETE CASCADE
      );
    `;

    await client.sql`
      CREATE TABLE IF NOT EXISTS catalog_sync_state (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'awaiting_bootstrap',
        sync_id UUID,
        cursor INTEGER NOT NULL DEFAULT 0,
        expected_count INTEGER,
        imported_count INTEGER NOT NULL DEFAULT 0,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        next_due_at TIMESTAMPTZ,
        lease_expires_at TIMESTAMPTZ,
        last_error TEXT
      );
    `;

    // Additive column for databases created before sync_id existed.
    await client.sql`
      ALTER TABLE catalog_sync_state
      ADD COLUMN IF NOT EXISTS sync_id UUID;
    `;

    // Immutable source snapshot for one catalog refresh (pid + ordinal).
    await client.sql`
      CREATE TABLE IF NOT EXISTS catalog_sync_items (
        sync_id UUID NOT NULL,
        ordinal INTEGER NOT NULL,
        pid TEXT NOT NULL,
        PRIMARY KEY (sync_id, ordinal),
        UNIQUE (sync_id, pid)
      );
    `;

    // Owned by snhu-transfers; created here so the shared DB has the matching shape.
    await client.sql`
      CREATE TABLE IF NOT EXISTS transfer_sync_items (
        sync_id UUID NOT NULL,
        ordinal INTEGER NOT NULL,
        pid TEXT NOT NULL,
        PRIMARY KEY (sync_id, ordinal),
        UNIQUE (sync_id, pid)
      );
    `;

    // Manual catalog:bootstrap must run before cron may refresh.
    await client.sql`
      INSERT INTO catalog_sync_state (id, status, cursor, imported_count)
      VALUES ('catalog', 'awaiting_bootstrap', 0, 0)
      ON CONFLICT (id) DO NOTHING;
    `;

    // Heal rows created before awaiting_bootstrap existed (idle + never scheduled).
    await client.sql`
      UPDATE catalog_sync_state
      SET status = 'awaiting_bootstrap'
      WHERE id = 'catalog'
        AND status = 'idle'
        AND completed_at IS NULL
        AND next_due_at IS NULL;
    `;

    // Stable read-only contract for other apps (e.g. snhu-transfers).
    // Do not query courses / courses_data directly from those codebases.
    await client.sql`
      CREATE OR REPLACE VIEW catalog_course_lookup AS
      SELECT DISTINCT ON (catalog_course_id)
          catalog_course_id AS course_code,
          title,
          pid,
          subject_code,
          academic_level,
          credits
      FROM courses_data
      WHERE catalog_course_id IS NOT NULL
      ORDER BY catalog_course_id, pid;
    `;

    console.log('Migrations applied successfully');
  } finally {
    client.release();
  }
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
