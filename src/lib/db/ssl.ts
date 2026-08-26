import fs from 'fs';
import type { ConnectionOptions } from 'tls';

const PEM_MARKER = '-----BEGIN CERTIFICATE-----';

function stripSslQueryParams(connectionString: string): string {
  const normalized = connectionString.replace(/^postgresql:/, 'postgres:');
  const url = new URL(normalized);

  url.searchParams.delete('sslmode');
  url.searchParams.delete('ssl');
  url.searchParams.delete('sslrootcert');
  url.searchParams.delete('sslcert');
  url.searchParams.delete('sslkey');
  url.searchParams.delete('uselibpqcompat');

  return url.toString().replace(/^postgres:/, 'postgresql:');
}

export function resolvePostgresCaCert(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.includes(PEM_MARKER)) {
    return trimmed.replace(/\\n/g, '\n');
  }

  return fs.readFileSync(trimmed, 'utf8');
}

function readCaCert(): string | undefined {
  return resolvePostgresCaCert(process.env.POSTGRES_CA_CERT);
}

export function resolvePgConnectionConfig(connectionString: string): {
  connectionString: string;
  ssl?: boolean | ConnectionOptions;
} {
  const cleanedConnectionString = stripSslQueryParams(connectionString);
  const ca = readCaCert();

  if (ca) {
    return {
      connectionString: cleanedConnectionString,
      ssl: {
        rejectUnauthorized: true,
        ca,
      },
    };
  }

  const normalized = connectionString.replace(/^postgresql:/, 'postgres:');
  const sslMode = new URL(normalized).searchParams.get('sslmode');

  if (sslMode === 'require' || sslMode === 'verify-ca' || sslMode === 'verify-full') {
    return {
      connectionString: cleanedConnectionString,
      ssl: true,
    };
  }

  return { connectionString: cleanedConnectionString };
}
