import { createClient, db, type VercelClient, type VercelPoolClient } from '@vercel/postgres';

export type CatalogDbClient = VercelClient | VercelPoolClient;

function createDirectClient(): VercelClient {
  // @vercel/postgres looks specifically for this legacy name when constructing
  // a direct client. Local catalog tools intentionally use POSTGRES_URL only.
  if (process.env.POSTGRES_URL) {
    process.env.POSTGRES_URL_NON_POOLING = process.env.POSTGRES_URL;
  }
  return createClient();
}

/**
 * Catalog tools use a direct connection so migrations and bootstrap do not rely
 * on a pooled runtime connection. Vercel request handlers keep using `db`.
 */
export async function withCatalogDbClient<T>(
  options: { direct?: boolean },
  fn: (client: CatalogDbClient) => Promise<T>
): Promise<T> {
  if (options.direct) {
    const client = createDirectClient();
    await client.connect();
    try {
      return await fn(client);
    } finally {
      await client.end();
    }
  }

  const client = await db.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
