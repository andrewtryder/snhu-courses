import './load-env';
import { runCatalogSyncBatch } from '../src/lib/catalog-sync';

async function main() {
  const args = process.argv.slice(2);
  const unsupportedArgs = args.filter((arg) => arg !== '--ignore-lease');
  if (unsupportedArgs.length > 0) {
    console.log(
      JSON.stringify({
        action: 'error',
        error: `Unsupported argument(s): ${unsupportedArgs.join(', ')}`,
      })
    );
    process.exitCode = 1;
    return;
  }

  if (!process.env.POSTGRES_URL) {
    console.log(JSON.stringify({ action: 'error', error: 'POSTGRES_URL is required' }));
    process.exitCode = 1;
    return;
  }

  const ignoreLease = args.includes('--ignore-lease');
  let result = await runCatalogSyncBatch({ direct: true, ignoreLease });
  while (result.action === 'batch') {
    result = await runCatalogSyncBatch({ direct: true, ignoreLease });
  }

  console.log(JSON.stringify(result));

  if (result.action === 'error') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.log(JSON.stringify({ action: 'error', error: message }));
  process.exitCode = 1;
});
