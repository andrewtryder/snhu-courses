import { Pool } from 'pg';
import { resolvePgConnectionConfig } from './ssl';
import { augmentQueryClient } from './sql';
import type { QueryClient } from './types';

const POOL_OPTIONS = {
  max: 1,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
} as const;

const globalForPg = globalThis as typeof globalThis & {
  pgPool?: Pool;
};

function createPool(): Pool {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL is required');
  }

  const { connectionString: cleanedConnectionString, ssl } =
    resolvePgConnectionConfig(connectionString);

  return new Pool({
    connectionString: cleanedConnectionString,
    ssl,
    ...POOL_OPTIONS,
  });
}

export function getPool(): Pool {
  if (!globalForPg.pgPool) {
    globalForPg.pgPool = createPool();
  }

  return globalForPg.pgPool;
}

export async function withPoolClient<T>(
  fn: (client: QueryClient) => Promise<T>
): Promise<T> {
  const rawClient = await getPool().connect();
  const client = augmentQueryClient(rawClient);

  try {
    return await fn(client);
  } finally {
    rawClient.release();
  }
}

export const RUNTIME_POOL_MAX = POOL_OPTIONS.max;
