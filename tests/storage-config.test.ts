import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storageConfig } from '../lib/storage-config';

test('Vercel requires PostgreSQL and cannot fall back to a local file', () => {
  assert.throws(() => storageConfig({ VERCEL: '1', SHAM_DB_PATH: '/tmp/sham.sqlite' }), {
    code: 'DATABASE_URL_REQUIRED',
  });
  assert.throws(() => storageConfig({ DATABASE_URL: 'file:secret-value' }), {
    code: 'DATABASE_URL_INVALID',
  });
  const config = storageConfig({ VERCEL: '1', DATABASE_URL: 'postgresql://example/db' });
  assert.equal(config.connectionString, 'postgresql://example/db');
  assert.equal(config.options.demo, false);
});
test('demo mode is explicitly enabled for cloud and local databases', () => {
  const config = storageConfig({
    VERCEL: '1',
    DATABASE_URL: 'postgres://example/db',
    SHAM_DEMO_MODE: 'true',
  });
  assert.deepEqual(config.options, { demo: true, adminPassword: undefined });
  assert.equal(storageConfig({ SHAM_DEMO_MODE: 'true' }).options.demo, true);
  assert.equal(storageConfig({ SHAM_DEMO_MODE: 'false' }).options.demo, false);
});
