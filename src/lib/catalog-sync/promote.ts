import type { VercelPoolClient } from '@vercel/postgres';
import { abortToIdle, markCompleted } from './persist';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export async function validateStaging(client: VercelPoolClient): Promise<ValidationResult> {
  const errors: string[] = [];

  const coursesCount = await client.sql`SELECT COUNT(*)::int AS count FROM courses_stage`;
  const dataCount = await client.sql`SELECT COUNT(*)::int AS count FROM courses_data_stage`;
  const state = await client.sql`
    SELECT expected_count, imported_count
    FROM catalog_sync_state
    WHERE id = 'catalog'
  `;

  const stageCourses = Number(coursesCount.rows[0].count);
  const stageData = Number(dataCount.rows[0].count);
  const expected =
    state.rows[0]?.expected_count === null || state.rows[0]?.expected_count === undefined
      ? null
      : Number(state.rows[0].expected_count);
  const imported = Number(state.rows[0]?.imported_count ?? 0);

  if (stageCourses === 0) {
    errors.push('courses_stage is empty');
  }
  if (stageData === 0) {
    errors.push('courses_data_stage is empty');
  }
  if (expected !== null && imported !== expected) {
    errors.push(`imported_count (${imported}) !== expected_count (${expected})`);
  }
  if (expected !== null && stageCourses !== expected) {
    errors.push(`courses_stage count (${stageCourses}) !== expected_count (${expected})`);
  }
  if (expected !== null && stageData !== expected) {
    errors.push(
      `courses_data_stage count (${stageData}) !== expected_count (${expected})`
    );
  }
  if (stageCourses !== stageData) {
    errors.push(
      `courses_stage count (${stageCourses}) !== courses_data_stage count (${stageData})`
    );
  }

  const missingData = await client.sql`
    SELECT c.pid
    FROM courses_stage c
    LEFT JOIN courses_data_stage d ON d.pid = c.pid
    WHERE d.pid IS NULL
    LIMIT 5
  `;
  if (missingData.rows.length > 0) {
    const pids = missingData.rows.map((r) => r.pid as string).join(', ');
    errors.push(`courses_stage pids missing from courses_data_stage: ${pids}`);
  }

  const orphanPrereqs = await client.sql`
    SELECT p.class_id
    FROM prerequisites_stage p
    LEFT JOIN courses_data_stage d ON d.pid = p.class_id
    WHERE d.pid IS NULL
    LIMIT 5
  `;
  if (orphanPrereqs.rows.length > 0) {
    const ids = orphanPrereqs.rows.map((r) => r.class_id as string).join(', ');
    errors.push(`prerequisites_stage class_ids missing from courses_data_stage: ${ids}`);
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Atomically replace live catalog tables from staging.
 * Truncate children first; insert parents first.
 * Does not touch transfer_courses.
 */
export async function promoteStaging(client: VercelPoolClient): Promise<void> {
  const validation = await validateStaging(client);
  if (!validation.ok) {
    const message = `Validation failed: ${validation.errors.join('; ')}`;
    await abortToIdle(client, message);
    throw new Error(message);
  }

  try {
    await client.query('BEGIN');

    // Truncate together (FK-safe). Child-first insert order still applies below.
    await client.sql`TRUNCATE prerequisites, courses_data, courses`;

    await client.sql`INSERT INTO courses SELECT * FROM courses_stage`;
    await client.sql`INSERT INTO courses_data SELECT * FROM courses_data_stage`;
    await client.sql`INSERT INTO prerequisites SELECT * FROM prerequisites_stage`;

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }

  await markCompleted(client);
}
