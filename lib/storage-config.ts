import { join } from 'node:path';
import { StorageConfigurationError } from './errors';
export type StoreOptions = { demo?: boolean; adminPassword?: string };
export function storageConfig(env: Record<string, string | undefined> = process.env) {
  const hosted = env.VERCEL === '1';
  const connectionString = env.DATABASE_URL?.trim();
  if (hosted && !connectionString) {
    throw new StorageConfigurationError(
      'DATABASE_URL_REQUIRED',
      'Set DATABASE_URL to a hosted PostgreSQL connection string in Vercel, then redeploy. / أضف رابط PostgreSQL في إعدادات Vercel ثم أعد النشر.',
    );
  }
  if (connectionString) {
    try {
      const url = new URL(connectionString);
      if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('protocol');
    } catch {
      throw new StorageConfigurationError(
        'DATABASE_URL_INVALID',
        'DATABASE_URL must be a PostgreSQL connection string. / يجب أن يكون DATABASE_URL رابط PostgreSQL.',
      );
    }
  }
  const demo = env.SHAM_DEMO_MODE === 'true';
  return {
    connectionString,
    path: env.SHAM_DB_PATH ?? join(process.cwd(), 'data', 'sham.sqlite'),
    options: { demo, adminPassword: env.SHAM_ADMIN_PASSWORD } satisfies StoreOptions,
  };
}
