import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolvePgConnectionConfig, resolvePostgresCaCert } from '../ssl';

const SAMPLE_PEM = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAKexample
-----END CERTIFICATE-----`;

describe('resolvePostgresCaCert', () => {
  const tempFiles: string[] = [];

  afterEach(() => {
    for (const file of tempFiles.splice(0)) {
      fs.unlinkSync(file);
    }
  });

  it('returns undefined for empty values', () => {
    expect(resolvePostgresCaCert(undefined)).toBeUndefined();
    expect(resolvePostgresCaCert('   ')).toBeUndefined();
  });

  it('uses inline PEM contents directly', () => {
    expect(resolvePostgresCaCert(SAMPLE_PEM)).toBe(SAMPLE_PEM);
  });

  it('normalizes escaped newlines in inline PEM values', () => {
    const escaped = SAMPLE_PEM.replace(/\n/g, '\\n');
    expect(resolvePostgresCaCert(escaped)).toBe(SAMPLE_PEM);
  });

  it('loads PEM contents from a filesystem path', () => {
    const file = path.join(os.tmpdir(), `pg-ca-${Date.now()}.pem`);
    fs.writeFileSync(file, SAMPLE_PEM, 'utf8');
    tempFiles.push(file);

    expect(resolvePostgresCaCert(file)).toBe(SAMPLE_PEM);
  });
});

describe('resolvePgConnectionConfig', () => {
  const originalCa = process.env.POSTGRES_CA_CERT;

  afterEach(() => {
    if (originalCa === undefined) {
      delete process.env.POSTGRES_CA_CERT;
    } else {
      process.env.POSTGRES_CA_CERT = originalCa;
    }
  });

  it('enables verified TLS when POSTGRES_CA_CERT is inline PEM', () => {
    process.env.POSTGRES_CA_CERT = SAMPLE_PEM;

    const config = resolvePgConnectionConfig(
      'postgresql://user:pass@host:5432/db?sslmode=require'
    );

    expect(config.connectionString).toBe('postgresql://user:pass@host:5432/db');
    expect(config.ssl).toEqual({
      rejectUnauthorized: true,
      ca: SAMPLE_PEM,
    });
  });
});
