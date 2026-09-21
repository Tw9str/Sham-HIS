import type { User } from './catalog';
import type { HospitalDatabase } from './database';
import { HospitalSession } from './domain-store';
import { DomainError } from './errors';
import { storageConfig, type StoreOptions } from './storage-config';
export { DomainError, StorageConfigurationError } from './errors';

export class HospitalStore {
  private constructor(
    public db: HospitalDatabase,
    public demo: boolean,
  ) {}
  static async fromDatabase(db: HospitalDatabase, options: StoreOptions = {}) {
    const store = new HospitalStore(db, options.demo ?? false);
    try {
      await store.run((s) => s.initialize(options.adminPassword), true);
      return store;
    } catch (error) {
      await db.close();
      throw error;
    }
  }
  static async open(path: string, demo = false, adminPassword?: string) {
    const { SqliteDatabase } = await import('./sqlite-database');
    return this.fromDatabase(new SqliteDatabase(path), { demo, adminPassword });
  }
  private run<T>(work: (session: HospitalSession) => Promise<T>, write = false) {
    return this.db.transaction(
      (connection) => work(new HospitalSession(connection, this.demo)),
      write,
    );
  }
  all<T>(table: 'records' | 'patients' | 'users') {
    return this.run((s) => s.all<T>(table));
  }
  record(id: string) {
    return this.run((s) => s.record(id));
  }
  user(token?: string) {
    return this.run((s) => s.user(token));
  }
  snapshot(user: User) {
    return this.run((s) => s.snapshot(user));
  }
  execute(user: User, input: unknown) {
    return this.run((s) => s.execute(user, input), true);
  }
  logout(token: string) {
    return this.run((s) => s.logout(token), true);
  }
  async login(email: string, password: string) {
    // Commit failed-attempt counters before reporting an authentication failure.
    const result = await this.run(async (s) => {
      try {
        return { value: await s.login(email, password) };
      } catch (error) {
        if (error instanceof DomainError && [401, 429].includes(error.status)) return { error };
        throw error;
      }
    }, true);
    if (result.error) throw result.error;
    return result.value!;
  }
  close() {
    return this.db.close();
  }
}

const shared = globalThis as typeof globalThis & { shamAsyncStore?: Promise<HospitalStore> };
export function getStore(): Promise<HospitalStore> {
  if (!shared.shamAsyncStore) {
    shared.shamAsyncStore = (async () => {
      const config = storageConfig();
      if (config.connectionString) {
        const { PostgresDatabase } = await import('./postgres-database');
        return HospitalStore.fromDatabase(
          new PostgresDatabase(config.connectionString),
          config.options,
        );
      }
      const { SqliteDatabase } = await import('./sqlite-database');
      return HospitalStore.fromDatabase(new SqliteDatabase(config.path), config.options);
    })().catch((error) => {
      shared.shamAsyncStore = undefined;
      throw error;
    });
  }
  return shared.shamAsyncStore;
}
