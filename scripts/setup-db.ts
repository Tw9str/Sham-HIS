import { getStore } from '../lib/store';
import type { User } from '../lib/catalog';

async function main() {
  const store = await getStore();
  try {
    const users = await store.all<User>('users');
    console.log(`Hospital database initialized (${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}). Existing records were preserved.`);
    console.log(`Demo enabled: ${store.demo}. Users: ${users.length}. Patients: ${(await store.all('patients')).length}. Records: ${(await store.all('records')).length}.`);
    console.log(`Administrator: ${users.find(user => user.role === 'admin')?.name ?? 'Not found'}.`);
  } finally { await store.close(); }
}
main().catch(error => {
  console.error('Database setup failed:', error instanceof Error ? error.name : 'Unknown error');
  if (error && typeof error === 'object' && 'code' in error) console.error('Code:', error.code);
  process.exitCode = 1;
});
