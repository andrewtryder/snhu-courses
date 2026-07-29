import { describe, expect, it, vi } from 'vitest';
import type { CatalogDbClient } from '../database';
import { promoteStaging } from '../promote';

const ACTIVE_SYNC_ID = 'current-sync';

function clientWithHandlers(): CatalogDbClient {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    sql: vi.fn(async (strings: TemplateStringsArray) => {
      const statement = strings.join('?');
      if (statement.includes('COUNT(*)::int AS count FROM courses_stage')) {
        return { rows: [{ count: 1 }] };
      }
      if (statement.includes('COUNT(*)::int AS count FROM courses_data_stage')) {
        return { rows: [{ count: 1 }] };
      }
      if (statement.includes('FROM catalog_sync_state')) {
        return {
          rows: [
            {
              expected_count: 1,
              imported_count: 1,
              sync_id: ACTIVE_SYNC_ID,
              status: 'running',
            },
          ],
        };
      }
      if (statement.includes('FROM courses_stage c')) return { rows: [] };
      if (statement.includes('FROM prerequisites_stage p')) return { rows: [] };
      if (statement.includes('FOR UPDATE') || statement.includes('RETURNING id')) {
        return { rows: [{ id: 'catalog' }] };
      }
      return { rows: [] };
    }),
  } as unknown as CatalogDbClient;
}

describe('catalog promotion ownership', () => {
  it('completes the owned sync before committing the live-table replacement', async () => {
    const client = clientWithHandlers();

    await promoteStaging(client, ACTIVE_SYNC_ID);

    const sqlStatements = vi.mocked(client.sql).mock.calls.map(([strings]) => strings.join('?'));
    const queryStatements = vi.mocked(client.query).mock.calls.map(([statement]) => statement);
    const completion = sqlStatements.findIndex((statement) => statement.includes('completed_at = NOW()'));

    expect(sqlStatements.find((statement) => statement.includes('FOR UPDATE'))).toContain(
      'AND sync_id = ?'
    );
    expect(completion).toBeGreaterThan(
      sqlStatements.findIndex((statement) => statement.includes('INSERT INTO prerequisites'))
    );
    expect(queryStatements).toEqual(['BEGIN', 'COMMIT']);
  });
});
