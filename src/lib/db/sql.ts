import type { QueryResult, QueryResultRow } from 'pg';

export function buildSqlQuery(
  strings: TemplateStringsArray,
  values: unknown[]
): { text: string; values: unknown[] } {
  let text = '';
  const params: unknown[] = [];

  strings.forEach((part, index) => {
    text += part;
    if (index < values.length) {
      params.push(values[index]);
      text += `$${params.length}`;
    }
  });

  return { text, values: params };
}

export type SqlQueryable = {
  query: <R extends QueryResultRow = QueryResultRow>(
    queryText: string,
    values?: unknown[]
  ) => Promise<QueryResult<R>>;
};

export type SqlClient = SqlQueryable & {
  sql: <R extends QueryResultRow = QueryResultRow>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<QueryResult<R>>;
};

export function augmentQueryClient<T extends SqlQueryable>(client: T): T & SqlClient {
  const augmented = client as T & SqlClient;

  augmented.sql = (strings, ...values) => {
    const built = buildSqlQuery(strings, values);
    return client.query(built.text, built.values);
  };

  return augmented;
}
