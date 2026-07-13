import { randomUUID } from 'crypto';
import type { VercelPoolClient } from '@vercel/postgres';
import type { ParsedCourse } from './parse';

export const CATALOG_SYNC_ID = 'catalog';
const SYNC_ITEMS_INSERT_CHUNK = 500;

export type SyncStatus = 'awaiting_bootstrap' | 'idle' | 'running';

export interface CatalogSyncState {
  id: string;
  status: SyncStatus;
  sync_id: string | null;
  cursor: number;
  expected_count: number | null;
  imported_count: number;
  started_at: Date | null;
  completed_at: Date | null;
  next_due_at: Date | null;
  lease_expires_at: Date | null;
  last_error: string | null;
}

function mapSyncStateRow(row: Record<string, unknown>): CatalogSyncState {
  return {
    id: row.id as string,
    status: row.status as SyncStatus,
    sync_id: (row.sync_id as string) ?? null,
    cursor: Number(row.cursor),
    expected_count: row.expected_count === null || row.expected_count === undefined
      ? null
      : Number(row.expected_count),
    imported_count: Number(row.imported_count),
    started_at: row.started_at ? new Date(row.started_at as string) : null,
    completed_at: row.completed_at ? new Date(row.completed_at as string) : null,
    next_due_at: row.next_due_at ? new Date(row.next_due_at as string) : null,
    lease_expires_at: row.lease_expires_at ? new Date(row.lease_expires_at as string) : null,
    last_error: (row.last_error as string) ?? null,
  };
}

export async function getSyncState(client: VercelPoolClient): Promise<CatalogSyncState> {
  const result = await client.sql`
    SELECT
      id,
      status,
      sync_id,
      cursor,
      expected_count,
      imported_count,
      started_at,
      completed_at,
      next_due_at,
      lease_expires_at,
      last_error
    FROM catalog_sync_state
    WHERE id = ${CATALOG_SYNC_ID}
  `;

  if (result.rows.length === 0) {
    throw new Error('catalog_sync_state row missing; run db:migrate first');
  }

  return mapSyncStateRow(result.rows[0] as Record<string, unknown>);
}

export async function clearStaging(client: VercelPoolClient): Promise<void> {
  // Single TRUNCATE so Postgres accepts FKs between staging tables.
  await client.sql`TRUNCATE prerequisites_stage, courses_data_stage, courses_stage`;
}

async function replaceSyncItems(
  client: VercelPoolClient,
  syncId: string,
  pids: string[]
): Promise<void> {
  await client.sql`DELETE FROM catalog_sync_items`;

  for (let offset = 0; offset < pids.length; offset += SYNC_ITEMS_INSERT_CHUNK) {
    const chunk = pids.slice(offset, offset + SYNC_ITEMS_INSERT_CHUNK);
    const ordinals = chunk.map((_, index) => offset + index);
    await client.query(
      `INSERT INTO catalog_sync_items (sync_id, ordinal, pid)
       SELECT $1::uuid, t.ordinal, t.pid
       FROM UNNEST($2::int[], $3::text[]) AS t(ordinal, pid)`,
      [syncId, ordinals, chunk]
    );
  }
}

/**
 * Start a refresh: clear staging, snapshot source pids into catalog_sync_items,
 * and mark state running. Returns the new sync_id.
 */
export async function startRefresh(
  client: VercelPoolClient,
  pids: string[]
): Promise<string> {
  if (pids.length === 0) {
    throw new Error('Cannot start refresh with an empty source list');
  }

  const syncId = randomUUID();
  await clearStaging(client);
  await replaceSyncItems(client, syncId, pids);

  await client.sql`
    UPDATE catalog_sync_state
    SET
      status = 'running',
      sync_id = ${syncId},
      cursor = 0,
      expected_count = ${pids.length},
      imported_count = 0,
      started_at = NOW(),
      completed_at = NULL,
      lease_expires_at = NOW() + INTERVAL '5 minutes',
      last_error = NULL
    WHERE id = ${CATALOG_SYNC_ID}
  `;

  return syncId;
}

/** Read the next batch of pids from the immutable snapshot for this sync. */
export async function getSyncItemsBatch(
  client: VercelPoolClient,
  syncId: string,
  cursor: number,
  limit: number
): Promise<string[]> {
  const result = await client.sql`
    SELECT pid
    FROM catalog_sync_items
    WHERE sync_id = ${syncId}
      AND ordinal >= ${cursor}
    ORDER BY ordinal ASC
    LIMIT ${limit}
  `;
  return result.rows.map((row) => row.pid as string);
}

/**
 * Atomically claim the catalog sync lease. Returns the updated state row on
 * success, or null if another worker still holds an unexpired lease.
 * When force is true (local ignoreLease), take the lease regardless of expiry.
 */
export async function tryClaimLease(
  client: VercelPoolClient,
  options: { force?: boolean } = {}
): Promise<CatalogSyncState | null> {
  const force = options.force ?? false;

  const result = force
    ? await client.sql`
        UPDATE catalog_sync_state
        SET lease_expires_at = NOW() + INTERVAL '5 minutes'
        WHERE id = ${CATALOG_SYNC_ID}
        RETURNING
          id,
          status,
          sync_id,
          cursor,
          expected_count,
          imported_count,
          started_at,
          completed_at,
          next_due_at,
          lease_expires_at,
          last_error
      `
    : await client.sql`
        UPDATE catalog_sync_state
        SET lease_expires_at = NOW() + INTERVAL '5 minutes'
        WHERE id = ${CATALOG_SYNC_ID}
          AND (
            lease_expires_at IS NULL
            OR lease_expires_at <= NOW()
          )
        RETURNING
          id,
          status,
          sync_id,
          cursor,
          expected_count,
          imported_count,
          started_at,
          completed_at,
          next_due_at,
          lease_expires_at,
          last_error
      `;

  if (result.rows.length === 0) {
    return null;
  }

  return mapSyncStateRow(result.rows[0] as Record<string, unknown>);
}

export async function setSyncError(client: VercelPoolClient, error: string): Promise<void> {
  await client.sql`
    UPDATE catalog_sync_state
    SET last_error = ${error}
    WHERE id = ${CATALOG_SYNC_ID}
  `;
}

/**
 * Abort a failed refresh. If bootstrap never completed (next_due_at still null),
 * restore awaiting_bootstrap so cron cannot start the initial import.
 */
export async function abortToIdle(client: VercelPoolClient, error: string): Promise<void> {
  await client.sql`
    UPDATE catalog_sync_state
    SET
      status = CASE
        WHEN next_due_at IS NULL THEN 'awaiting_bootstrap'
        ELSE 'idle'
      END,
      lease_expires_at = NULL,
      last_error = ${error}
    WHERE id = ${CATALOG_SYNC_ID}
  `;
}

export async function insertStagedCourse(
  client: VercelPoolClient,
  course: ParsedCourse
): Promise<void> {
  await client.sql`
    INSERT INTO courses_stage (
      course_id, academic_level, translated_level, passed_catalog_query, start_date,
      online_offering, campus_offering, pid, course_uuid, title, subject_code,
      subject_description, translated_subject, subject_id, activation_date, score
    ) VALUES (
      ${course.course_id}, ${course.academic_level}, ${course.translated_level},
      ${course.passed_catalog_query}, ${course.start_date},
      ${course.online_offering}, ${course.campus_offering}, ${course.pid},
      ${course.course_uuid}, ${course.title}, ${course.subject_code},
      ${course.subject_description}, ${course.translated_subject},
      ${course.subject_id}, ${course.activation_date}, ${course.score}
    )
    ON CONFLICT (pid) DO UPDATE SET
      course_id = EXCLUDED.course_id,
      academic_level = EXCLUDED.academic_level,
      translated_level = EXCLUDED.translated_level,
      passed_catalog_query = EXCLUDED.passed_catalog_query,
      start_date = EXCLUDED.start_date,
      online_offering = EXCLUDED.online_offering,
      campus_offering = EXCLUDED.campus_offering,
      course_uuid = EXCLUDED.course_uuid,
      title = EXCLUDED.title,
      subject_code = EXCLUDED.subject_code,
      subject_description = EXCLUDED.subject_description,
      translated_subject = EXCLUDED.translated_subject,
      subject_id = EXCLUDED.subject_id,
      activation_date = EXCLUDED.activation_date,
      score = EXCLUDED.score
  `;

  await client.sql`
    INSERT INTO courses_data_stage (
      pid, title, catalog_course_id, description, academic_level,
      credits, date_start, online_offering, campus_offering, subject_code
    ) VALUES (
      ${course.pid}, ${course.title}, ${course.course_id}, ${course.description},
      ${course.academic_level}, ${course.credits}, ${course.start_date},
      ${course.online_offering}, ${course.campus_offering}, ${course.subject_code}
    )
    ON CONFLICT (pid) DO UPDATE SET
      title = EXCLUDED.title,
      catalog_course_id = EXCLUDED.catalog_course_id,
      description = EXCLUDED.description,
      academic_level = EXCLUDED.academic_level,
      credits = EXCLUDED.credits,
      date_start = EXCLUDED.date_start,
      online_offering = EXCLUDED.online_offering,
      campus_offering = EXCLUDED.campus_offering,
      subject_code = EXCLUDED.subject_code
  `;

  await client.sql`
    DELETE FROM prerequisites_stage WHERE class_id = ${course.pid}
  `;

  for (const prereqId of course.prerequisites) {
    await client.sql`
      INSERT INTO prerequisites_stage (class_id, course_id)
      VALUES (${course.pid}, ${prereqId})
    `;
  }
}

export async function advanceCursor(
  client: VercelPoolClient,
  newCursor: number,
  importedDelta: number
): Promise<void> {
  await client.sql`
    UPDATE catalog_sync_state
    SET
      cursor = ${newCursor},
      imported_count = imported_count + ${importedDelta},
      lease_expires_at = NOW() + INTERVAL '5 minutes'
    WHERE id = ${CATALOG_SYNC_ID}
  `;
}

export async function markCompleted(client: VercelPoolClient): Promise<void> {
  await client.sql`
    UPDATE catalog_sync_state
    SET
      status = 'idle',
      completed_at = NOW(),
      next_due_at = NOW() + INTERVAL '2 months',
      lease_expires_at = NULL,
      last_error = NULL
    WHERE id = ${CATALOG_SYNC_ID}
  `;
}
