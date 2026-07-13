import './load-env';
import { runCatalogSyncBatch } from '../src/lib/catalog-sync';

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL is required');
    process.exit(1);
  }

  const result = await runCatalogSyncBatch({ ignoreLease: true });
  console.log(JSON.stringify(result, null, 2));

  if (result.action === 'error') {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Catalog sync failed:', error);
  process.exit(1);
});
