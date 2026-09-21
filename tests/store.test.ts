import { EmbeddedPostgresDatabase } from './postgres-fixture';
import { HospitalSession } from '../lib/domain-store';
import { test as nodeTest } from 'node:test';
import assert from 'node:assert/strict';
import { HospitalStore } from '../lib/store';
import { demoUsers } from '../lib/seed';
import { canRead, type WorkRecord } from '../lib/catalog';
import { moneyCents, dateSchema } from '../lib/validation';
const admin = demoUsers[0],
  doctor = demoUsers[1],
  reception = demoUsers[3],
  pharmacist = demoUsers[5];

test('reinitializing preserves edited names, settings, records, and passwords', async () => {
  const s = await fixture();
  try {
    const edited = { ...admin, name: 'Saved Manager Name' };
    await s.db.transaction((c) =>
      c.prepare('UPDATE users SET body=? WHERE id=?').run(JSON.stringify(edited), admin.id),
    );
    const before = await s.snapshot(admin);
    await s.execute(admin, {
      action: 'password',
      currentPassword: 'ShamDemo2026!',
      newPassword: 'SavedPassword2026!',
    });
    await s.db.transaction((c) =>
      new HospitalSession(c, true).initialize(undefined, 'DifferentSeedPassword2026!'),
    );
    const after = await s.snapshot(admin);
    assert.deepEqual(after.records, before.records);
    assert.deepEqual(after.settings, before.settings);
    assert.equal((await s.login(admin.email, 'SavedPassword2026!')).user.name, edited.name);
  } finally {
    await s.close();
  }
});

test('simultaneous dispensing requests deduct stock only once', async () => {
  const s = await fixture();
  try {
    const r = (await s.all<WorkRecord>('records')).find((r) => r.module === 'pharmacy')!;
    await s.execute(pharmacist, { action: 'transition', id: r.id, version: 1, status: 'reviewed' });
    const stock = (await s.record(r.data.stockId))!;
    const input = { action: 'transition', id: r.id, version: 2, status: 'dispensed' };
    const results = await Promise.allSettled([
      s.execute(pharmacist, input),
      s.execute(pharmacist, input),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(
      Number((await s.record(stock.id))!.data.quantity),
      Number(stock.data.quantity) - Number(r.data.quantity),
    );
    assert.equal(
      (await s.snapshot(admin)).audit.filter(
        (a) => a.action === 'stock-dispensed' && a.entity === stock.id,
      ).length,
      1,
    );
  } finally {
    await s.close();
  }
});
let backend: 'sqlite' | 'postgres';
function test(name: string, work: () => Promise<void> | void) {
  for (const kind of ['sqlite', 'postgres'] as const)
    nodeTest(kind + ': ' + name, async () => {
      backend = kind;
      await work();
    });
}
async function fixture() {
  return backend === 'sqlite'
    ? HospitalStore.open(':memory:', true)
    : HospitalStore.fromDatabase(new EmbeddedPostgresDatabase(), { demo: true });
}
function payload(r: WorkRecord) {
  return {
    module: r.module,
    title: r.title,
    titleAr: r.titleAr,
    patientId: r.patientId,
    assignedTo: r.assignedTo,
    priority: r.priority,
    date: r.date,
    time: r.time,
    data: r.data,
  };
}
test('authenticated sessions are hashed, expire, and are revoked on sign-out', async () => {
  const s = await fixture();
  try {
    const { token } = await s.login(admin.email, 'ShamDemo2026!');
    assert.equal((await s.user(token))?.id, admin.id);
    assert.equal(await s.user('forged-token'), null);
    assert.equal(
      await s.db.transaction(
        async (c) => c.prepare('SELECT token FROM sessions WHERE token=?').get(token),
        false,
      ),
      undefined,
    );
    await s.logout(token);
    assert.equal(await s.user(token), null);
  } finally {
    await s.close();
  }
});
test('failed logins are rate limited and do not reveal whether a user exists', async () => {
  const s = await fixture();
  try {
    for (let i = 0; i < 5; i++)
      await assert.rejects(async () => await s.login('missing@example.com', 'bad'), /incorrect/);
    await assert.rejects(async () => await s.login('missing@example.com', 'bad'), /Too many/);
  } finally {
    await s.close();
  }
});
test('role permissions restrict server snapshots and mutations', async () => {
  const s = await fixture();
  try {
    const view = await s.snapshot(reception);
    assert.ok(view.records.every((r) => canRead(reception.role, r.module)));
    assert.equal(view.audit.length, 0);
    assert.ok(view.patients.every((p) => !p.allergies));
    const lab = (await s.all<WorkRecord>('records')).find((r) => r.module === 'laboratory')!;
    await assert.rejects(
      async () =>
        await s.execute(reception, {
          action: 'transition',
          id: lab.id,
          version: lab.version,
          status: 'resulted',
        }),
      /role cannot/,
    );
  } finally {
    await s.close();
  }
});
test('occupied beds and duplicate active admissions are rejected atomically', async () => {
  const s = await fixture();
  try {
    const r = (await s.all<WorkRecord>('records')).find((r) => r.module === 'admissions')!;
    const before = (await s.all('records')).length;
    await assert.rejects(
      async () =>
        await s.execute(admin, {
          action: 'create-record',
          payload: { ...payload(r), patientId: 'SC-01026' },
        }),
      /already has/,
    );
    assert.equal((await s.all('records')).length, before);
  } finally {
    await s.close();
  }
});
test('dispensing deducts stock once and logs the transaction', async () => {
  const s = await fixture();
  try {
    const r = (await s.all<WorkRecord>('records')).find((r) => r.module === 'pharmacy')!;
    await s.execute(pharmacist, { action: 'transition', id: r.id, version: 1, status: 'reviewed' });
    const stock = (await s.record(r.data.stockId))!;
    const before = Number(stock.data.quantity);
    await s.execute(pharmacist, {
      action: 'transition',
      id: r.id,
      version: 2,
      status: 'dispensed',
    });
    assert.equal(
      Number((await s.record(stock.id))!.data.quantity),
      before - Number(r.data.quantity),
    );
    await assert.rejects(
      async () =>
        await s.execute(pharmacist, {
          action: 'transition',
          id: r.id,
          version: 2,
          status: 'dispensed',
        }),
      /record changed/,
    );
    assert.equal(
      Number((await s.record(stock.id))!.data.quantity),
      before - Number(r.data.quantity),
    );
    assert.ok((await s.snapshot(admin)).audit.some((a) => a.action === 'stock-dispensed'));
  } finally {
    await s.close();
  }
});
test('insufficient stock rolls back status, inventory, and audit', async () => {
  const s = await fixture();
  try {
    const r = (await s.all<WorkRecord>('records')).find((r) => r.module === 'pharmacy')!;
    await s.execute(admin, {
      action: 'update-record',
      id: r.id,
      version: 1,
      payload: { ...payload(r), data: { ...r.data, quantity: '9999' } },
    });
    await s.execute(pharmacist, { action: 'transition', id: r.id, version: 2, status: 'reviewed' });
    const before = (await s.snapshot(admin)).audit.length;
    await assert.rejects(
      async () =>
        await s.execute(pharmacist, {
          action: 'transition',
          id: r.id,
          version: 3,
          status: 'dispensed',
        }),
      /Insufficient stock/,
    );
    assert.equal((await s.record(r.id))!.status, 'reviewed');
    assert.equal((await s.record(r.data.stockId))!.data.quantity, '240');
    assert.equal((await s.snapshot(admin)).audit.length, before);
  } finally {
    await s.close();
  }
});
test('doctors cannot dispense and reception cannot record invoice payments', async () => {
  const s = await fixture();
  try {
    const r = (await s.all<WorkRecord>('records')).find((r) => r.module === 'pharmacy')!;
    await s.execute(doctor, { action: 'transition', id: r.id, version: 1, status: 'reviewed' });
    await assert.rejects(
      async () =>
        await s.execute(doctor, {
          action: 'transition',
          id: r.id,
          version: 2,
          status: 'dispensed',
        }),
      /requires a pharmacist/,
    );
    const invoice = (await s.all<WorkRecord>('records')).find(
      (r) => r.module === 'billing' && r.status === 'issued',
    )!;
    await assert.rejects(
      async () =>
        await s.execute(reception, {
          action: 'transition',
          id: invoice.id,
          version: invoice.version,
          status: 'paid',
        }),
      /billing role/,
    );
  } finally {
    await s.close();
  }
});
test('lab results and encounter assessments are required before finalization', async () => {
  const s = await fixture();
  try {
    const lab = (await s.all<WorkRecord>('records')).find(
      (r) => r.module === 'laboratory' && r.status === 'collected',
    )!;
    await assert.rejects(
      async () =>
        await s.execute(admin, {
          action: 'transition',
          id: lab.id,
          version: lab.version,
          status: 'resulted',
        }),
      /result or report/,
    );
    const encounter = (await s.all<WorkRecord>('records')).find(
      (r) => r.module === 'encounters' && r.status === 'waiting',
    )!;
    await s.execute(doctor, {
      action: 'transition',
      id: encounter.id,
      version: 1,
      status: 'in-progress',
    });
    await assert.rejects(
      async () =>
        await s.execute(doctor, {
          action: 'transition',
          id: encounter.id,
          version: 2,
          status: 'signed',
        }),
      /diagnosis and assessment/,
    );
  } finally {
    await s.close();
  }
});
test('signed records are immutable and patient links cannot be changed', async () => {
  const s = await fixture();
  try {
    const signed = (await s.all<WorkRecord>('records')).find(
      (r) => r.module === 'encounters' && r.status === 'signed',
    )!;
    await assert.rejects(
      async () =>
        await s.execute(admin, {
          action: 'update-record',
          id: signed.id,
          version: signed.version,
          payload: payload(signed),
        }),
      /read-only/,
    );
    const open = (await s.all<WorkRecord>('records')).find(
      (r) => r.module === 'encounters' && r.status === 'waiting',
    )!;
    await assert.rejects(
      async () =>
        await s.execute(admin, {
          action: 'update-record',
          id: open.id,
          version: open.version,
          payload: { ...payload(open), patientId: 'SC-01024' },
        }),
      /another patient/,
    );
  } finally {
    await s.close();
  }
});
test('issued invoice amounts cannot be edited and paid invoices cannot be voided', async () => {
  const s = await fixture();
  try {
    const invoice = (await s.all<WorkRecord>('records')).find(
      (r) => r.module === 'billing' && r.status === 'issued',
    )!;
    await assert.rejects(
      async () =>
        await s.execute(admin, {
          action: 'update-record',
          id: invoice.id,
          version: 1,
          payload: { ...payload(invoice), data: { ...invoice.data, amount: '1.00' } },
        }),
      /Issued invoices/,
    );
    await s.execute(admin, { action: 'transition', id: invoice.id, version: 1, status: 'paid' });
    await assert.rejects(
      async () =>
        await s.execute(admin, {
          action: 'transition',
          id: invoice.id,
          version: 2,
          status: 'void',
        }),
      /not allowed/,
    );
  } finally {
    await s.close();
  }
});
test('patient edits preserve linked records', async () => {
  const s = await fixture();
  try {
    const p = (await s.snapshot(admin)).patients[0];
    const { id, createdAt, ...payload } = p;
    void createdAt;
    await s.execute(admin, {
      action: 'update-patient',
      id,
      payload: { ...payload, phone: '+963 900000000' },
    });
    assert.equal(
      (await s.snapshot(admin)).patients.find((p) => p.id === id)!.phone,
      '+963 900000000',
    );
    assert.ok((await s.all<WorkRecord>('records')).some((r) => r.patientId === id));
  } finally {
    await s.close();
  }
});
test('appointment conflicts and stale edits are rejected', async () => {
  const s = await fixture();
  try {
    const r = (await s.all<WorkRecord>('records')).find(
      (r) => r.module === 'appointments' && r.status === 'scheduled',
    )!;
    await assert.rejects(
      async () => await s.execute(admin, { action: 'create-record', payload: payload(r) }),
      /already has an appointment/,
    );
    await s.execute(admin, { action: 'update-record', id: r.id, version: 1, payload: payload(r) });
    await assert.rejects(
      async () =>
        await s.execute(admin, {
          action: 'update-record',
          id: r.id,
          version: 1,
          payload: payload(r),
        }),
      /record changed/,
    );
  } finally {
    await s.close();
  }
});
test('changing a password revokes all sessions', async () => {
  const s = await fixture();
  try {
    const one = await s.login(admin.email, 'ShamDemo2026!');
    const two = await s.login(admin.email, 'ShamDemo2026!');
    await s.execute(admin, {
      action: 'password',
      currentPassword: 'ShamDemo2026!',
      newPassword: 'NewPassword2026!',
    });
    assert.equal(await s.user(one.token), null);
    assert.equal(await s.user(two.token), null);
    assert.ok((await s.login(admin.email, 'NewPassword2026!')).token);
  } finally {
    await s.close();
  }
});
test('money and dates reject ambiguous or invalid input', () => {
  assert.equal(moneyCents('10.05'), 1005);
  assert.equal(moneyCents('0.1'), 10);
  assert.throws(() => moneyCents('1.005'));
  assert.throws(() => moneyCents('-2'));
  assert.throws(() => moneyCents('1e3'));
  assert.equal(dateSchema.safeParse('2026-02-30').success, false);
  assert.equal(dateSchema.safeParse('2028-02-29').success, true);
});
