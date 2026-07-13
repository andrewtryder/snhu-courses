import { db, type VercelPoolClient } from '@vercel/postgres';
import { fetchCourseDetails, fetchCourses, type KualiCourseListItem } from './fetch';
import { parseCourse, type ParsedCourse } from './parse';
import {
  advanceCursor,
  getSyncItemsBatch,
  getSyncState,
  insertStagedCourse,
  setSyncError,
  startRefresh,
  tryClaimLease,
  type CatalogSyncState,
} from './persist';
import { promoteStaging } from './promote';

export const CRON_BATCH_SIZE = 50;
export const CRON_CONCURRENCY = 5;
export const BOOTSTRAP_CONCURRENCY = 8;

export type CatalogSyncResult =
  | { action: 'skipped'; reason: string; state: CatalogSyncState }
  | {
      action: 'batch';
      processed: number;
      imported: number;
      cursor: number;
      expected: number;
      done: false;
    }
  | {
      action: 'promoted';
      processed: number;
      imported: number;
      expected: number;
      done: true;
    }
  | { action: 'error'; error: string };

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];

  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function fetchAndParseBatch(
  pids: string[],
  concurrency: number
): Promise<ParsedCourse[]> {
  const parsed = await mapWithConcurrency(pids, concurrency, async (pid) => {
    const details = await fetchCourseDetails(pid);
    if (!details) return null;
    return parseCourse(details, pid);
  });
  return parsed.filter((c): c is ParsedCourse => c !== null);
}

async function withClient<T>(fn: (client: VercelPoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

async function loadCourseList(): Promise<KualiCourseListItem[]> {
  const courses = await fetchCourses('');
  if (!courses || courses.length === 0) {
    throw new Error('Failed to fetch courses from Kuali (empty or null)');
  }
  return courses;
}

/** Stable, deduplicated pid order for one refresh snapshot. */
export function uniquePids(courses: KualiCourseListItem[]): string[] {
  const seen = new Set<string>();
  const pids: string[] = [];
  for (const course of courses) {
    if (!course.pid || seen.has(course.pid)) continue;
    seen.add(course.pid);
    pids.push(course.pid);
  }
  return pids;
}

/**
 * Full local bootstrap: fetch entire catalog once, snapshot pids, fill staging,
 * validate, promote. Safe to run as long as needed outside Vercel.
 */
export async function bootstrapCatalog(
  options: { concurrency?: number } = {}
): Promise<{ imported: number; expected: number }> {
  const concurrency = options.concurrency ?? BOOTSTRAP_CONCURRENCY;

  return withClient(async (client) => {
    console.log('Fetching complete course list...');
    const courses = await loadCourseList();
    const pids = uniquePids(courses);

    console.log(`Found ${pids.length} courses. Starting staging import...`);
    const syncId = await startRefresh(client, pids);

    for (let i = 0; i < pids.length; i += CRON_BATCH_SIZE) {
      const slice = await getSyncItemsBatch(client, syncId, i, CRON_BATCH_SIZE);
      const parsed = await fetchAndParseBatch(slice, concurrency);

      for (const course of parsed) {
        await insertStagedCourse(client, course);
      }

      const newCursor = i + slice.length;
      await advanceCursor(client, newCursor, parsed.length);
      console.log(
        `Staged batch: ${parsed.length} imported, cursor ${newCursor}/${pids.length}`
      );
    }

    const state = await getSyncState(client);
    console.log(
      `Validating and promoting (${state.imported_count}/${state.expected_count} imported)...`
    );
    await promoteStaging(client);
    console.log('Bootstrap complete');

    return {
      imported: state.imported_count,
      expected: state.expected_count ?? pids.length,
    };
  });
}

/**
 * One cron/local sync tick:
 * - if awaiting_bootstrap: skip
 * - if running: process next batch from catalog_sync_items (and promote when finished)
 * - else if due: fetch list once, snapshot pids, process first batch
 * - else: skip
 */
export async function runCatalogSyncBatch(
  options: { batchSize?: number; concurrency?: number; ignoreLease?: boolean } = {}
): Promise<CatalogSyncResult> {
  const batchSize = options.batchSize ?? CRON_BATCH_SIZE;
  const concurrency = options.concurrency ?? CRON_CONCURRENCY;
  const ignoreLease = options.ignoreLease ?? false;

  return withClient(async (client) => {
    try {
      let state = await getSyncState(client);
      const now = new Date();

      if (state.status === 'awaiting_bootstrap') {
        return {
          action: 'skipped',
          reason: 'not_bootstrapped',
          state,
        };
      }

      const wasRunning = state.status === 'running';

      if (!wasRunning) {
        // next_due_at is only set by a successful bootstrap/promote; null is never due.
        const due =
          state.next_due_at !== null && state.next_due_at.getTime() <= now.getTime();
        if (!due) {
          return {
            action: 'skipped',
            reason: 'not_due',
            state,
          };
        }
      }

      const claimed = await tryClaimLease(client, { force: ignoreLease });
      if (!claimed) {
        return {
          action: 'skipped',
          reason: 'lease_held',
          state,
        };
      }

      if (!wasRunning) {
        console.log('Catalog refresh due; fetching course list and snapshotting pids...');
        const courses = await loadCourseList();
        await startRefresh(client, uniquePids(courses));
        state = await getSyncState(client);
      } else {
        state = claimed;
      }

      if (!state.sync_id) {
        throw new Error('catalog_sync_state.sync_id missing while status is running');
      }

      const expected = state.expected_count ?? 0;
      const cursor = state.cursor;

      if (cursor >= expected) {
        await promoteStaging(client);
        return {
          action: 'promoted',
          processed: 0,
          imported: state.imported_count,
          expected,
          done: true,
        };
      }

      const slice = await getSyncItemsBatch(client, state.sync_id, cursor, batchSize);
      if (slice.length === 0) {
        await promoteStaging(client);
        return {
          action: 'promoted',
          processed: 0,
          imported: state.imported_count,
          expected,
          done: true,
        };
      }

      const parsed = await fetchAndParseBatch(slice, concurrency);

      for (const course of parsed) {
        await insertStagedCourse(client, course);
      }

      const newCursor = cursor + slice.length;
      await advanceCursor(client, newCursor, parsed.length);
      const importedTotal = state.imported_count + parsed.length;

      if (newCursor >= expected) {
        await promoteStaging(client);
        return {
          action: 'promoted',
          processed: slice.length,
          imported: importedTotal,
          expected,
          done: true,
        };
      }

      return {
        action: 'batch',
        processed: slice.length,
        imported: parsed.length,
        cursor: newCursor,
        expected,
        done: false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        await setSyncError(client, message);
      } catch {
        // ignore secondary failure
      }
      return { action: 'error', error: message };
    }
  });
}
