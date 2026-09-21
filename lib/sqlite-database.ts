import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { HospitalDatabase, SqlConnection } from './database';

export class SqliteDatabase implements HospitalDatabase {
  private db: DatabaseSync;
  private tail: Promise<void> = Promise.resolve();
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  }
  async transaction<T>(work: (connection: SqlConnection) => Promise<T>, write = true): Promise<T> {
    // Async operations must never interleave on a single SQLite connection.
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      this.db.exec(write ? 'BEGIN IMMEDIATE' : 'BEGIN');
      const result = await work({
        exec: async (sql) => {
          this.db.exec(sql);
        },
        prepare: (sql) => {
          const statement = this.db.prepare(sql);
          return {
            run: async (...values) => {
              statement.run(...values);
            },
            get: async (...values) => statement.get(...values),
            all: async (...values) => statement.all(...values),
          };
        },
      });
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      if (this.db.isTransaction) this.db.exec('ROLLBACK');
      throw error;
    } finally {
      release();
    }
  }
  async close() {
    await this.tail;
    this.db.close();
  }
}
