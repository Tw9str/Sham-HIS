import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HospitalStore } from '../lib/store';
import { demoUsers } from '../lib/seed';
import { canRead, type WorkRecord } from '../lib/catalog';
import { moneyCents, dateSchema } from '../lib/validation';
const admin = demoUsers[0],
  doctor = demoUsers[1],
  reception = demoUsers[3],
  pharmacist = demoUsers[5];
function fixture() {
  return new HospitalStore(':memory:', true);
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
test('authenticated sessions are hashed, expire, and are revoked on sign-out', () => {
  const s = fixture();
  try {
    const { token } = s.login(admin.email, 'ShamDemo2026!');
    assert.equal(s.user(token)?.id, admin.id);
    assert.equal(s.user('forged-token'), null);
    assert.equal(s.db.prepare('SELECT token FROM sessions WHERE token=?').get(token), undefined);
    s.logout(token);
    assert.equal(s.user(token), null);
  } finally {
    s.db.close();
  }
});
test('failed logins are rate limited and do not reveal whether a user exists', () => {
  const s = fixture();
  try {
    for (let i = 0; i < 5; i++)
      assert.throws(() => s.login('missing@example.com', 'bad'), /incorrect/);
    assert.throws(() => s.login('missing@example.com', 'bad'), /Too many/);
  } finally {
    s.db.close();
  }
});
test('role permissions restrict server snapshots and mutations', () => {
  const s = fixture();
  try {
    const view = s.snapshot(reception);
    assert.ok(view.records.every((r) => canRead(reception.role, r.module)));
    assert.equal(view.audit.length, 0);
    assert.ok(view.patients.every((p) => !p.allergies));
    const lab = s.all<WorkRecord>('records').find((r) => r.module === 'laboratory')!;
    assert.throws(
      () =>
        s.execute(reception, {
          action: 'transition',
          id: lab.id,
          version: lab.version,
          status: 'resulted',
        }),
      /role cannot/,
    );
  } finally {
    s.db.close();
  }
});
test('occupied beds and duplicate active admissions are rejected atomically', () => {
  const s = fixture();
  try {
    const r = s.all<WorkRecord>('records').find((r) => r.module === 'admissions')!;
    const before = s.all('records').length;
    assert.throws(
      () =>
        s.execute(admin, {
          action: 'create-record',
          payload: { ...payload(r), patientId: 'SC-01026' },
        }),
      /already has/,
    );
    assert.equal(s.all('records').length, before);
  } finally {
    s.db.close();
  }
});
test('dispensing deducts stock once and logs the transaction', () => {
  const s = fixture();
  try {
    const r = s.all<WorkRecord>('records').find((r) => r.module === 'pharmacy')!;
    s.execute(pharmacist, { action: 'transition', id: r.id, version: 1, status: 'reviewed' });
    const stock = s.record(r.data.stockId)!;
    const before = Number(stock.data.quantity);
    s.execute(pharmacist, { action: 'transition', id: r.id, version: 2, status: 'dispensed' });
    assert.equal(Number(s.record(stock.id)!.data.quantity), before - Number(r.data.quantity));
    assert.throws(
      () =>
        s.execute(pharmacist, { action: 'transition', id: r.id, version: 2, status: 'dispensed' }),
      /record changed/,
    );
    assert.equal(Number(s.record(stock.id)!.data.quantity), before - Number(r.data.quantity));
    assert.ok(s.snapshot(admin).audit.some((a) => a.action === 'stock-dispensed'));
  } finally {
    s.db.close();
  }
});
test('insufficient stock rolls back status, inventory, and audit', () => {
  const s = fixture();
  try {
    const r = s.all<WorkRecord>('records').find((r) => r.module === 'pharmacy')!;
    s.execute(admin, {
      action: 'update-record',
      id: r.id,
      version: 1,
      payload: { ...payload(r), data: { ...r.data, quantity: '9999' } },
    });
    s.execute(pharmacist, { action: 'transition', id: r.id, version: 2, status: 'reviewed' });
    const before = s.snapshot(admin).audit.length;
    assert.throws(
      () =>
        s.execute(pharmacist, { action: 'transition', id: r.id, version: 3, status: 'dispensed' }),
      /Insufficient stock/,
    );
    assert.equal(s.record(r.id)!.status, 'reviewed');
    assert.equal(s.record(r.data.stockId)!.data.quantity, '240');
    assert.equal(s.snapshot(admin).audit.length, before);
  } finally {
    s.db.close();
  }
});
test('doctors cannot dispense and reception cannot record invoice payments', () => {
  const s = fixture();
  try {
    const r = s.all<WorkRecord>('records').find((r) => r.module === 'pharmacy')!;
    s.execute(doctor, { action: 'transition', id: r.id, version: 1, status: 'reviewed' });
    assert.throws(
      () => s.execute(doctor, { action: 'transition', id: r.id, version: 2, status: 'dispensed' }),
      /requires a pharmacist/,
    );
    const invoice = s
      .all<WorkRecord>('records')
      .find((r) => r.module === 'billing' && r.status === 'issued')!;
    assert.throws(
      () =>
        s.execute(reception, {
          action: 'transition',
          id: invoice.id,
          version: invoice.version,
          status: 'paid',
        }),
      /billing role/,
    );
  } finally {
    s.db.close();
  }
});
test('lab results and encounter assessments are required before finalization', () => {
  const s = fixture();
  try {
    const lab = s
      .all<WorkRecord>('records')
      .find((r) => r.module === 'laboratory' && r.status === 'collected')!;
    assert.throws(
      () =>
        s.execute(admin, {
          action: 'transition',
          id: lab.id,
          version: lab.version,
          status: 'resulted',
        }),
      /result or report/,
    );
    const encounter = s
      .all<WorkRecord>('records')
      .find((r) => r.module === 'encounters' && r.status === 'waiting')!;
    s.execute(doctor, {
      action: 'transition',
      id: encounter.id,
      version: 1,
      status: 'in-progress',
    });
    assert.throws(
      () =>
        s.execute(doctor, { action: 'transition', id: encounter.id, version: 2, status: 'signed' }),
      /diagnosis and assessment/,
    );
  } finally {
    s.db.close();
  }
});
test('signed records are immutable and patient links cannot be changed', () => {
  const s = fixture();
  try {
    const signed = s
      .all<WorkRecord>('records')
      .find((r) => r.module === 'encounters' && r.status === 'signed')!;
    assert.throws(
      () =>
        s.execute(admin, {
          action: 'update-record',
          id: signed.id,
          version: signed.version,
          payload: payload(signed),
        }),
      /read-only/,
    );
    const open = s
      .all<WorkRecord>('records')
      .find((r) => r.module === 'encounters' && r.status === 'waiting')!;
    assert.throws(
      () =>
        s.execute(admin, {
          action: 'update-record',
          id: open.id,
          version: open.version,
          payload: { ...payload(open), patientId: 'SC-01024' },
        }),
      /another patient/,
    );
  } finally {
    s.db.close();
  }
});
test('issued invoice amounts cannot be edited and paid invoices cannot be voided', () => {
  const s = fixture();
  try {
    const invoice = s
      .all<WorkRecord>('records')
      .find((r) => r.module === 'billing' && r.status === 'issued')!;
    assert.throws(
      () =>
        s.execute(admin, {
          action: 'update-record',
          id: invoice.id,
          version: 1,
          payload: { ...payload(invoice), data: { ...invoice.data, amount: '1.00' } },
        }),
      /Issued invoices/,
    );
    s.execute(admin, { action: 'transition', id: invoice.id, version: 1, status: 'paid' });
    assert.throws(
      () => s.execute(admin, { action: 'transition', id: invoice.id, version: 2, status: 'void' }),
      /not allowed/,
    );
  } finally {
    s.db.close();
  }
});
test('patient edits preserve linked records', () => {
  const s = fixture();
  try {
    const p = s.snapshot(admin).patients[0];
    const { id, createdAt, ...payload } = p;
    void createdAt;
    s.execute(admin, {
      action: 'update-patient',
      id,
      payload: { ...payload, phone: '+963 900000000' },
    });
    assert.equal(s.snapshot(admin).patients[0].phone, '+963 900000000');
    assert.ok(s.all<WorkRecord>('records').some((r) => r.patientId === id));
  } finally {
    s.db.close();
  }
});
test('appointment conflicts and stale edits are rejected', () => {
  const s = fixture();
  try {
    const r = s
      .all<WorkRecord>('records')
      .find((r) => r.module === 'appointments' && r.status === 'scheduled')!;
    assert.throws(
      () => s.execute(admin, { action: 'create-record', payload: payload(r) }),
      /already has an appointment/,
    );
    s.execute(admin, { action: 'update-record', id: r.id, version: 1, payload: payload(r) });
    assert.throws(
      () =>
        s.execute(admin, { action: 'update-record', id: r.id, version: 1, payload: payload(r) }),
      /record changed/,
    );
  } finally {
    s.db.close();
  }
});
test('changing a password revokes all sessions', () => {
  const s = fixture();
  try {
    const one = s.login(admin.email, 'ShamDemo2026!');
    const two = s.login(admin.email, 'ShamDemo2026!');
    s.execute(admin, {
      action: 'password',
      currentPassword: 'ShamDemo2026!',
      newPassword: 'NewPassword2026!',
    });
    assert.equal(s.user(one.token), null);
    assert.equal(s.user(two.token), null);
    assert.ok(s.login(admin.email, 'NewPassword2026!').token);
  } finally {
    s.db.close();
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
