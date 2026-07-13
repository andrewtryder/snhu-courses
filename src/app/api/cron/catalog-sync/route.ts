import { NextResponse } from 'next/server';
import { runCatalogSyncBatch } from '@/lib/catalog-sync';

export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.POSTGRES_URL) {
    return NextResponse.json(
      { error: 'Failed to connect to the database. Ensure POSTGRES_URL is set.' },
      { status: 500 }
    );
  }

  const result = await runCatalogSyncBatch();

  if (result.action === 'error') {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}
