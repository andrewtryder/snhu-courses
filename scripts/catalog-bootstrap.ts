import { bootstrapCatalog } from '../src/lib/catalog-sync';

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL is required');
    process.exit(1);
  }

  const result = await bootstrapCatalog();
  console.log(
    `Catalog bootstrap finished: imported ${result.imported} of ${result.expected} courses`
  );
}

main().catch((error) => {
  console.error('Catalog bootstrap failed:', error);
  process.exit(1);
});
