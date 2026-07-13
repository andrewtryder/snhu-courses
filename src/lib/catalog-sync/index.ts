import { db, type VercelPoolClient } from '@vercel/postgres';
import { fetchCourseDetails, fetchCourses, type KualiCourseListItem } from './fetch';
import { parseCourse, type ParsedCourse } from './parse';
import {
  advanceCursor,
  getSyncState,
  insertStagedCourse,
  isLeaseActive,
  refreshLease,
  setSyncError,
  startRefresh,
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
  listItems: KualiCourseListItem[],
  concurrency: number
): Promise<ParsedCourse[]> {
  const parsed = await mapWithConcurrency(listItems, concurrency, async (item) => {
    const details = await fetchCourseDetails(item.pid);
    if (!details) return null;
    return parseCourse(item, details);
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

/**
 * Full local bootstrap: fetch entire catalog, fill staging, validate, promote.
 * Safe to run as long as needed outside Vercel.
 */
export async function bootstrapCatalog(
  options: { concurrency?: number } = {}
): Promise<{ imported: number; expected: number }> {
  const concurrency = options.concurrency ?? BOOTSTRAP_CONCURRENCY;

  return withClient(async (client) => {
    console.log('Fetching complete course list...');
    const courses = await loadCourseList();

    console.log(`Found ${courses.length} courses. Starting staging import...`);
    await startRefresh(client, courses.length);

    for (let i = 0; i < courses.length; i += CRON_BATCH_SIZE) {
      const slice = courses.slice(i, i + CRON_BATCH_SIZE);
      const parsed = await fetchAndParseBatch(slice, concurrency);

      for (const course of parsed) {
        await insertStagedCourse(client, course);
      }

      const newCursor = i + slice.length;
      await advanceCursor(client, newCursor, parsed.length);
      console.log(
        `Staged batch: ${parsed.length} imported, cursor ${newCursor}/${courses.length}`
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
      expected: state.expected_count ?? courses.length,
    };
  });
}

/**
 * One cron/local sync tick:
 * - if running: process next batch (and promote when finished)
 * - else if due: start refresh and process first batch
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

      if (state.status === 'running') {
        if (!ignoreLease && isLeaseActive(state, now)) {
          return {
            action: 'skipped',
            reason: 'lease_held',
            state,
          };
        }
        await refreshLease(client);
      } else {
        const due =
          state.next_due_at === null || state.next_due_at.getTime() <= now.getTime();
        if (!due) {
          return {
            action: 'skipped',
            reason: 'not_due',
            state,
          };
        }

        console.log('Catalog refresh due; fetching course list...');
        const courses = await loadCourseList();
        await startRefresh(client, courses.length);
        state = await getSyncState(client);
      }

      const courses = await loadCourseList();
      const expected = state.expected_count ?? courses.length;
      const cursor = state.cursor;

      if (cursor >= expected || cursor >= courses.length) {
        await promoteStaging(client);
        return {
          action: 'promoted',
          processed: 0,
          imported: state.imported_count,
          expected,
          done: true,
        };
      }

      const end = Math.min(cursor + batchSize, expected, courses.length);
      const slice = courses.slice(cursor, end);
      const parsed = await fetchAndParseBatch(slice, concurrency);

      for (const course of parsed) {
        await insertStagedCourse(client, course);
      }

      const newCursor = end;
      await advanceCursor(client, newCursor, parsed.length);
      const importedTotal = state.imported_count + parsed.length;

      if (newCursor >= expected || newCursor >= courses.length) {
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
