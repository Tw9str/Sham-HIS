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
test('hosted demo credentials must be explicitly configured', () => {
  const env = { VERCEL: '1', DATABASE_URL: 'postgres://example/db', SHAM_DEMO_MODE: 'true' };
  for (const password of [undefined, 'short', 'ShamDemo2026!']) {
    assert.throws(() => storageConfig({ ...env, SHAM_DEMO_PASSWORD: password }), {
      code: 'HOSTED_DEMO_PASSWORD_REQUIRED',
    });
  }
  assert.equal(
    storageConfig({ ...env, SHAM_DEMO_PASSWORD: 'UniqueHostedDemo2026!' }).options.demo,
    true,
  );
  assert.equal(storageConfig({ SHAM_DEMO_MODE: 'true' }).connectionString, undefined);
});
