export type SqlValue = string | number | null;
export type SqlRow = Record<string, unknown>;
export interface SqlStatement {
  run(...values: SqlValue[]): Promise<void>;
  get(...values: SqlValue[]): Promise<SqlRow | undefined>;
  all(...values: SqlValue[]): Promise<SqlRow[]>;
}
export interface SqlConnection {
  exec(sql: string): Promise<void>;
  prepare(sql: string): SqlStatement;
}
export interface HospitalDatabase {
  transaction<T>(work: (connection: SqlConnection) => Promise<T>, write?: boolean): Promise<T>;
  close(): Promise<void>;
}
// Only application-owned SQL is translated. Values are always bound separately.
export function postgresPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}
