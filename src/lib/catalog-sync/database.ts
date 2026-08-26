import { withDirectClient } from '@/lib/db/client';
import { withPoolClient } from '@/lib/db/pool';
import type { CatalogDbClient } from '@/lib/db/types';

export type { CatalogDbClient } from '@/lib/db/types';

/**
 * Catalog tools use a direct connection so migrations and bootstrap do not rely
 * on a pooled runtime connection. Vercel request handlers keep using the pool.
 */
export async function withCatalogDbClient<T>(
  options: { direct?: boolean },
  fn: (client: CatalogDbClient) => Promise<T>
): Promise<T> {
  if (options.direct) {
    return withDirectClient(fn);
  }

  return withPoolClient(fn);
}
