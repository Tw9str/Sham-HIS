import { Pool } from 'pg';
import { attachDatabasePool } from '@vercel/functions';
import { postgresPlaceholders, type HospitalDatabase, type SqlConnection } from './database';

export class PostgresDatabase implements HospitalDatabase {
  private pool: Pool;
  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: true,
    });
    // Log only an error code; connection errors may otherwise expose credentials.
    this.pool.on('error', (error) =>
      console.error('PostgreSQL pool error', { code: (error as Error & { code?: string }).code }),
    );
    if (process.env.VERCEL === '1') attachDatabasePool(this.pool);
  }
  async transaction<T>(work: (connection: SqlConnection) => Promise<T>, write = true): Promise<T> {
    const client = await this.pool.connect();
    let inTransaction = false;
    let discard = false;
    try {
      await client.query(write ? 'BEGIN' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      inTransaction = true;
      await client.query("SET LOCAL statement_timeout = '20000ms'");
      await client.query("SET LOCAL lock_timeout = '10000ms'");
      // Match SQLite's single-writer semantics across all Vercel instances.
      // The transaction-scoped lock also prevents competing initialization.
      if (write) await client.query('SELECT pg_advisory_xact_lock(1936220525)');
      const result = await work({
        exec: async (sql) => {
          await client.query(sql);
        },
        prepare: (sql) => {
          const query = postgresPlaceholders(sql);
          return {
            run: async (...values) => {
              await client.query(query, values);
            },
            get: async (...values) => (await client.query(query, values)).rows[0],
            all: async (...values) => (await client.query(query, values)).rows,
          };
        },
      });
      await client.query('COMMIT');
      inTransaction = false;
      return result;
    } catch (error) {
      if (inTransaction) {
        try {
          await client.query('ROLLBACK');
        } catch {
          discard = true;
        }
      }
      throw error;
    } finally {
      client.release(discard);
    }
  }
  async close() {
    await this.pool.end();
  }
}
