import { Client } from 'pg';
import { resolvePgConnectionConfig } from './ssl';
import { augmentQueryClient } from './sql';
import type { QueryClient } from './types';

function getConnectionString(): string {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL is required');
  }
  return connectionString;
}

export async function withDirectClient<T>(
  fn: (client: QueryClient) => Promise<T>
): Promise<T> {
  const { connectionString, ssl } = resolvePgConnectionConfig(getConnectionString());
  const rawClient = new Client({ connectionString, ssl });
  await rawClient.connect();
  const client = augmentQueryClient(rawClient);

  try {
    return await fn(client);
  } finally {
    await rawClient.end();
  }
}

export { Client as PgClient };
