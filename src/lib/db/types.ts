import type { Client, PoolClient } from 'pg';
import type { SqlClient } from './sql';

export type QueryClient = SqlClient;

export type CatalogDbClient = QueryClient &
  Partial<Pick<PoolClient, 'release'>> &
  Partial<Pick<Client, 'end' | 'connect'>>;
