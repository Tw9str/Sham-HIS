import { getStore } from '../lib/store';
async function main() {
  const store = await getStore();
  console.log(`Hospital database initialized (${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}). Existing records were preserved.`);
  await store.close();
}
main().catch(error => {
  console.error('Database setup failed:', error instanceof Error ? error.name : 'Unknown error');
  if (error && typeof error === 'object' && 'code' in error) console.error('Code:', error.code);
  process.exitCode = 1;
});
