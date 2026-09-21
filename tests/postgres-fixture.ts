import { PGlite } from '@electric-sql/pglite';
import {
  postgresPlaceholders,
  type HospitalDatabase,
  type SqlConnection,
  type SqlRow,
} from '../lib/database';

// Runs the shared SQL against embedded PostgreSQL; network pooling is checked separately.
export class EmbeddedPostgresDatabase implements HospitalDatabase {
  private db = new PGlite();
  async transaction<T>(work: (connection: SqlConnection) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) =>
      work({
        exec: async (sql) => {
          await tx.exec(sql);
        },
        prepare: (sql) => {
          const query = postgresPlaceholders(sql);
          return {
            run: async (...values) => {
              await tx.query(query, values);
            },
            get: async (...values) => (await tx.query<SqlRow>(query, values)).rows[0],
            all: async (...values) => (await tx.query<SqlRow>(query, values)).rows,
          };
        },
      }),
    );
  }
  async close() {
    await this.db.close();
  }
}
