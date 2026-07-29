import { describe, expect, it, vi } from 'vitest';
import type { CatalogDbClient } from '../database';
import {
  advanceCursor,
  markCompleted,
  tryClaimBootstrapLease,
} from '../persist';

type SqlHandler = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<{ rows: Record<string, unknown>[] }>;

function clientWith(sqlHandler: SqlHandler): CatalogDbClient {
  return {
    sql: vi.fn(sqlHandler),
    query: vi.fn(),
  } as unknown as CatalogDbClient;
}

const stateRow = {
  id: 'catalog',
  status: 'awaiting_bootstrap',
  sync_id: null,
  cursor: 0,
  expected_count: null,
  imported_count: 0,
  started_at: null,
  completed_at: null,
  next_due_at: null,
  lease_expires_at: null,
  last_error: null,
};

describe('catalog bootstrap ownership', () => {
  it('rejects a second bootstrap while the first lease is active', async () => {
    let leaseActive = false;
    const client = clientWith(async (strings) => {
      const statement = strings.join('?');
      expect(statement).toContain("status IN ('awaiting_bootstrap', 'idle')");
      expect(statement).toContain('lease_expires_at <= NOW()');

      if (leaseActive) return { rows: [] };
      leaseActive = true;
      return { rows: [stateRow] };
    });

    await expect(tryClaimBootstrapLease(client)).resolves.toMatchObject({ id: 'catalog' });
    await expect(tryClaimBootstrapLease(client)).resolves.toBeNull();
  });

  it('claims an expired bootstrap lease', async () => {
    const client = clientWith(async () => ({
      rows: [{ ...stateRow, status: 'idle', lease_expires_at: new Date(0) }],
    }));

    await expect(tryClaimBootstrapLease(client)).resolves.toMatchObject({
      status: 'idle',
      lease_expires_at: new Date(0),
    });
  });

  it('rejects a stale cursor owner without changing the tracked state', async () => {
    const trackedState = { cursor: 50, imported: 50 };
    const client = clientWith(async (strings) => {
      const statement = strings.join('?');
      expect(statement).toContain('AND sync_id = ?');
      expect(statement).toContain("AND status = 'running'");
      return { rows: [] };
    });

    await expect(advanceCursor(client, 'stale-sync', 100, 50)).rejects.toThrow(
      'Catalog sync no longer owns the current state'
    );
    expect(trackedState).toEqual({ cursor: 50, imported: 50 });
  });

  it('accepts a current cursor owner and completes by releasing the lease', async () => {
    const statements: string[] = [];
    const client = clientWith(async (strings) => {
      const statement = strings.join('?');
      statements.push(statement);
      return { rows: statement.includes('RETURNING id') ? [{ id: 'catalog' }] : [] };
    });

    await expect(advanceCursor(client, 'current-sync', 100, 50)).resolves.toBeUndefined();
    await expect(markCompleted(client)).resolves.toBeUndefined();

    expect(statements.join('\n')).toContain("status = 'idle'");
    expect(statements.join('\n')).toContain('lease_expires_at = NULL');
  });
});
