import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  canRead,
  canWrite,
  moduleById,
  type User,
  type WorkRecord,
  type Patient,
  type Snapshot,
  type Audit,
} from './catalog';
import { seedData, demoUsers } from './seed';
import { actionSchema, dateSchema, integerQuantity, moneyCents } from './validation';

export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function fail(en: string, ar: string, status = 400): never {
  throw new DomainError(`${en} / ${ar}`, status);
}
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function checkPassword(password: string, stored: string) {
  const [salt, key] = stored.split(':');
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(key, 'hex'));
}
export class HospitalStore {
  db: DatabaseSync;
  demo: boolean;
  constructor(path: string, demo = false, adminPassword?: string) {
    this.demo = demo;
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
   CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, body TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY, body TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, module TEXT NOT NULL, patient_id TEXT REFERENCES patients(id), body TEXT NOT NULL);
   CREATE INDEX IF NOT EXISTS records_module ON records(module);
   CREATE INDEX IF NOT EXISTS records_patient ON records(patient_id);
   CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS login_attempts (email TEXT PRIMARY KEY, attempts INTEGER NOT NULL, blocked_until INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, entity TEXT NOT NULL, detail TEXT NOT NULL, at TEXT NOT NULL);
  `);
    if (!this.db.prepare('SELECT value FROM meta WHERE key=?').get('initialized')) {
      if (!demo && (!adminPassword || adminPassword.length < 12))
        throw new Error(
          'Set SHAM_ADMIN_PASSWORD (12+ characters) or enable SHAM_DEMO_MODE for local evaluation.',
        );
      this.db.exec('BEGIN IMMEDIATE');
      try {
        const users = demo ? demoUsers : [demoUsers[0]];
        for (const u of users)
          this.db
            .prepare('INSERT INTO users VALUES (?,?,?,?)')
            .run(
              u.id,
              u.email,
              hashPassword(demo ? 'ShamDemo2026!' : adminPassword!),
              JSON.stringify(u),
            );
        if (demo) {
          const seed = seedData();
          for (const p of seed.patients)
            this.db.prepare('INSERT INTO patients VALUES (?,?)').run(p.id, JSON.stringify(p));
          for (const r of seed.records) this.insertRecord(r);
        }
        this.db
          .prepare('INSERT INTO meta VALUES (?,?)')
          .run(
            'settings',
            JSON.stringify({
              name: 'Sham Clinic',
              nameAr: 'عيادة شام',
              address: 'Damascus, Syria / دمشق، سوريا',
              phone: '+963 11 000 0000',
            }),
          );
        this.db.prepare('INSERT INTO meta VALUES (?,?)').run('demo', String(demo));
        this.db.prepare('INSERT INTO meta VALUES (?,?)').run('initialized', '1');
        this.audit(
          'System',
          'initialized',
          'workspace',
          demo
            ? 'Fictional evaluation dataset / بيانات تقييم تجريبية'
            : 'New workspace / مساحة عمل جديدة',
        );
        this.db.exec('COMMIT');
      } catch (e) {
        this.db.exec('ROLLBACK');
        throw e;
      }
    }
    const storedDemo =
      (this.db.prepare('SELECT value FROM meta WHERE key=?').get('demo') as { value: string })
        ?.value === 'true';
    if (storedDemo !== demo)
      throw new Error(
        'Database mode differs from SHAM_DEMO_MODE. Use a separate SHAM_DB_PATH for an empty non-demo workspace.',
      );
  }
  audit(actor: string, action: string, entity: string, detail: string) {
    this.db
      .prepare('INSERT INTO audit VALUES (?,?,?,?,?,?)')
      .run(randomUUID(), actor, action, entity, detail, now());
  }
  all<T>(table: 'records' | 'patients' | 'users'): T[] {
    return (this.db.prepare(`SELECT body FROM ${table}`).all() as { body: string }[]).map((r) =>
      JSON.parse(r.body),
    );
  }
  record(recordId: string) {
    const r = this.db.prepare('SELECT body FROM records WHERE id=?').get(recordId) as
      { body: string } | undefined;
    return r ? (JSON.parse(r.body) as WorkRecord) : undefined;
  }
  insertRecord(r: WorkRecord) {
    this.db
      .prepare('INSERT INTO records VALUES (?,?,?,?)')
      .run(r.id, r.module, r.patientId || null, JSON.stringify(r));
  }
  saveRecord(r: WorkRecord) {
    this.db
      .prepare('UPDATE records SET patient_id=?, body=? WHERE id=?')
      .run(r.patientId || null, JSON.stringify(r), r.id);
  }
  login(email: string, password: string) {
    email = email.toLowerCase().trim();
    const attempts = this.db.prepare('SELECT * FROM login_attempts WHERE email=?').get(email) as
      { attempts: number; blocked_until: number } | undefined;
    if (attempts && attempts.blocked_until > Date.now())
      fail('Too many attempts. Try again in 15 minutes.', 'محاولات كثيرة. حاول بعد 15 دقيقة.', 429);
    const row = this.db.prepare('SELECT * FROM users WHERE email=?').get(email) as
      { id: string; password: string; body: string } | undefined;
    const valid = checkPassword(
      password,
      row?.password ?? '00000000000000000000000000000000:' + '0'.repeat(128),
    );
    if (!row || !valid) {
      const count = attempts && attempts.blocked_until === 0 ? attempts.attempts + 1 : 1;
      this.db
        .prepare('INSERT OR REPLACE INTO login_attempts VALUES (?,?,?)')
        .run(email, count, count >= 5 ? Date.now() + 900000 : 0);
      fail('Email or password is incorrect.', 'البريد أو كلمة المرور غير صحيحة.', 401);
    }
    this.db.prepare('DELETE FROM login_attempts WHERE email=?').run(email);
    this.db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
    const token = randomBytes(32).toString('hex');
    this.db
      .prepare('INSERT INTO sessions VALUES (?,?,?)')
      .run(hashToken(token), row.id, Date.now() + 12 * 3600000);
    this.audit(row.id, 'sign-in', 'session', 'Signed in / تسجيل الدخول');
    return { token, user: JSON.parse(row.body) as User };
  }
  user(token?: string) {
    if (!token) return null;
    const row = this.db
      .prepare(
        'SELECT users.body FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token=? AND sessions.expires>?',
      )
      .get(hashToken(token), Date.now()) as { body: string } | undefined;
    return row ? (JSON.parse(row.body) as User) : null;
  }
  logout(token: string) {
    const u = this.user(token);
    this.db.prepare('DELETE FROM sessions WHERE token=?').run(hashToken(token));
    if (u) this.audit(u.id, 'sign-out', 'session', 'Signed out / تسجيل الخروج');
  }
  snapshot(user: User): Snapshot {
    const patients = this.all<Patient>('patients').map((p) =>
      ['reception', 'billing'].includes(user.role) ? { ...p, allergies: '', blood: 'Unknown' } : p,
    );
    return {
      user,
      patients,
      records: this.all<WorkRecord>('records').filter((r) => canRead(user.role, r.module)),
      users: this.all<User>('users'),
      audit:
        user.role === 'admin'
          ? (this.db
              .prepare('SELECT * FROM audit ORDER BY at DESC LIMIT 300')
              .all() as unknown as Audit[])
          : [],
      settings: JSON.parse(
        (this.db.prepare('SELECT value FROM meta WHERE key=?').get('settings') as { value: string })
          .value,
      ),
      demo: this.demo,
    };
  }
  validateRecord(r: WorkRecord, user: User, previous?: WorkRecord) {
    const mod = moduleById(r.module);
    if (!mod || !canWrite(user.role, r.module))
      fail(
        'You do not have permission to change this module.',
        'لا تملك صلاحية تعديل هذا القسم.',
        403,
      );
    if (mod.patient && !this.db.prepare('SELECT id FROM patients WHERE id=?').get(r.patientId))
      fail('Select an existing patient.', 'اختر مريضًا مسجلًا.');
    if (!mod.patient && r.patientId)
      fail('This module does not accept a patient link.', 'لا يقبل هذا القسم ربط مريض.');
    if (!this.db.prepare('SELECT id FROM users WHERE id=?').get(r.assignedTo))
      fail('Select a staff member.', 'اختر موظفًا.');
    const expected = mod.fields.map((f) => f.key);
    if (Object.keys(r.data).some((k) => !expected.includes(k)))
      fail('Unknown form field.', 'حقل غير معروف.');
    for (const field of mod.fields) {
      const value = r.data[field.key] ?? '';
      if (field.required && !value) fail(`Required: ${field.label.en}`, `مطلوب: ${field.label.ar}`);
      if (value && field.options && !field.options.includes(value))
        fail('Invalid field option.', 'خيار حقل غير صالح.');
      if (value && field.type === 'date' && !dateSchema.safeParse(value).success)
        fail('Invalid date.', 'تاريخ غير صالح.');
    }
    if (['billing', 'insurance', 'procurement'].includes(r.module)) {
      try {
        moneyCents(r.data.amount);
      } catch (e) {
        throw new DomainError((e as Error).message);
      }
    }
    if (r.module === 'inventory' || r.module === 'pharmacy') {
      try {
        integerQuantity(r.data.quantity);
        if (r.module === 'inventory') integerQuantity(r.data.reorder);
      } catch (e) {
        throw new DomainError((e as Error).message);
      }
      if (r.module === 'pharmacy' && Number(r.data.quantity) === 0)
        fail('Prescription quantity must be positive.', 'كمية الوصفة يجب أن تكون أكبر من صفر.');
    }
    if (r.module === 'admissions' && r.status === 'admitted') {
      if (
        this.all<WorkRecord>('records').some(
          (x) =>
            x.module === 'admissions' &&
            x.status === 'admitted' &&
            x.id !== r.id &&
            (x.data.bed === r.data.bed || x.patientId === r.patientId),
        )
      )
        fail(
          'This bed or patient already has an active admission.',
          'السرير أو المريض مرتبط بدخول نشط.',
          409,
        );
    }
    if (
      r.module === 'appointments' &&
      r.status !== 'cancelled' &&
      this.all<WorkRecord>('records').some(
        (x) =>
          x.module === 'appointments' &&
          x.id !== r.id &&
          !['cancelled', 'completed'].includes(x.status) &&
          x.date === r.date &&
          x.time === r.time &&
          (x.assignedTo === r.assignedTo || x.patientId === r.patientId),
      )
    )
      fail(
        'The clinician or patient already has an appointment at this time.',
        'الطبيب أو المريض لديه موعد في هذا الوقت.',
        409,
      );
    if (previous && previous.module !== r.module)
      fail('The record module cannot change.', 'لا يمكن تغيير قسم السجل.');
    if (previous && previous.patientId !== r.patientId)
      fail('A record cannot be reassigned to another patient.', 'لا يمكن نقل السجل إلى مريض آخر.');
    if (
      previous &&
      [
        'signed',
        'verified',
        'dispensed',
        'paid',
        'void',
        'discharged',
        'completed',
        'received',
        'resolved',
      ].includes(previous.status)
    )
      fail('Finalized records are read-only.', 'السجلات النهائية للقراءة فقط.', 409);
    if (previous && r.module === 'billing' && previous.status === 'issued')
      fail(
        'Issued invoices are read-only. Void and create a corrected invoice.',
        'الفاتورة الصادرة للقراءة فقط. ألغها وأنشئ فاتورة مصححة.',
        409,
      );
  }
  execute(user: User, input: unknown) {
    const parsed = actionSchema.safeParse(input);
    if (!parsed.success)
      throw new DomainError(
        parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      );
    const action = parsed.data;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      let entity = '';
      if (action.action === 'create-patient' || action.action === 'update-patient') {
        if (!['admin', 'reception', 'doctor', 'nurse'].includes(user.role))
          fail('Patient editing is not allowed for your role.', 'دورك لا يسمح بتعديل المرضى.', 403);
        const previous =
          action.action === 'update-patient'
            ? this.all<Patient>('patients').find((p) => p.id === action.id)
            : undefined;
        if (action.action === 'update-patient' && !previous)
          fail('Patient not found.', 'المريض غير موجود.', 404);
        if (action.action === 'update-patient' && user.role === 'reception')
          fail(
            'Reception can register patients; clinical edits require a clinician.',
            'الاستقبال يسجل المرضى؛ تعديل الملف يتطلب مختصًا.',
            403,
          );
        const patient: Patient = {
          ...action.payload,
          id: previous?.id ?? id('SC'),
          createdAt: previous?.createdAt ?? now(),
        };
        if (user.role === 'reception') {
          patient.allergies = '';
          patient.blood = 'Unknown';
        }
        this.db
          .prepare(
            'INSERT INTO patients VALUES (?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body',
          )
          .run(patient.id, JSON.stringify(patient));
        entity = patient.id;
      } else if (action.action === 'create-record' || action.action === 'update-record') {
        const previous = action.action === 'update-record' ? this.record(action.id) : undefined;
        if (action.action === 'update-record' && !previous)
          fail('Record not found.', 'السجل غير موجود.', 404);
        if (action.action === 'update-record' && previous?.version !== action.version)
          fail(
            'This record changed. Refresh and try again.',
            'تم تغيير السجل. حدّث الصفحة وحاول مجددًا.',
            409,
          );
        const mod = moduleById(action.payload.module);
        if (!mod) fail('Unknown module.', 'قسم غير معروف.');
        const r: WorkRecord = {
          ...action.payload,
          module: mod.id,
          id: previous?.id ?? id(mod.id.slice(0, 3).toUpperCase()),
          status: previous?.status ?? mod.states[0],
          version: (previous?.version ?? 0) + 1,
          createdAt: previous?.createdAt ?? now(),
        };
        this.validateRecord(r, user, previous);
        if (previous) this.saveRecord(r);
        else this.insertRecord(r);
        entity = r.id;
      } else if (action.action === 'transition') {
        const r = this.record(action.id);
        if (!r) fail('Record not found.', 'السجل غير موجود.', 404);
        if (!canWrite(user.role, r.module))
          fail('Your role cannot change this record.', 'دورك لا يسمح بتغيير السجل.', 403);
        if (r.version !== action.version)
          fail(
            'This record changed. Refresh and try again.',
            'تم تغيير السجل. حدّث الصفحة وحاول مجددًا.',
            409,
          );
        const mod = moduleById(r.module)!;
        const next = mod.states[mod.states.indexOf(r.status) + 1];
        const specialCancel =
          (r.module === 'appointments' &&
            action.status === 'cancelled' &&
            !['cancelled', 'completed'].includes(r.status)) ||
          (r.module === 'billing' &&
            action.status === 'void' &&
            ['draft', 'issued'].includes(r.status)) ||
          (r.module === 'insurance' && action.status === 'rejected' && r.status === 'submitted');
        if (
          (action.status !== next && !specialCancel) ||
          [
            'completed',
            'cancelled',
            'signed',
            'verified',
            'dispensed',
            'paid',
            'void',
            'approved',
            'rejected',
            'inactive',
            'received',
            'resolved',
            'discharged',
          ].includes(r.status)
        )
          fail('This status transition is not allowed.', 'انتقال الحالة غير مسموح.', 409);
        if (
          r.module === 'encounters' &&
          action.status === 'signed' &&
          (!r.data.diagnosis || !r.data.assessment)
        )
          fail(
            'Add a diagnosis and assessment before signing.',
            'أضف التشخيص والتقييم قبل التوقيع.',
          );
        if (
          ['laboratory', 'radiology'].includes(r.module) &&
          ['resulted', 'reported', 'verified'].includes(action.status) &&
          !r.data.result
        )
          fail('Enter a result or report first.', 'أدخل النتيجة أو التقرير أولًا.');
        if (
          ['surgery', 'quality', 'equipment'].includes(r.module) &&
          ['completed', 'resolved'].includes(action.status) &&
          !r.data.result
        )
          fail('Document the outcome first.', 'وثق النتيجة أولًا.');
        if (r.module === 'nursing' && action.status === 'completed' && !r.data.observation)
          fail('Document the observation first.', 'وثق الملاحظة أولًا.');
        if (r.module === 'pharmacy' && action.status === 'dispensed') {
          if (!['admin', 'pharmacist'].includes(user.role))
            fail('Dispensing requires a pharmacist.', 'صرف الدواء يتطلب صيدليًا.', 403);
          const stock = this.record(r.data.stockId);
          if (!stock || stock.module !== 'inventory' || stock.status !== 'active')
            fail(
              'Select an active stock item using its reference.',
              'حدد صنف مخزون نشطًا باستخدام مرجعه.',
            );
          if (stock.data.expiry < now().slice(0, 10))
            fail('Expired stock cannot be dispensed.', 'لا يمكن صرف مخزون منتهي الصلاحية.');
          const quantity = integerQuantity(r.data.quantity);
          const available = integerQuantity(stock.data.quantity);
          if (quantity > available)
            fail('Insufficient stock for this prescription.', 'المخزون غير كافٍ لهذه الوصفة.', 409);
          stock.data.quantity = String(available - quantity);
          stock.version++;
          this.saveRecord(stock);
          this.audit(user.id, 'stock-dispensed', stock.id, `${quantity} → ${r.id}`);
        }
        if (
          r.module === 'billing' &&
          action.status === 'paid' &&
          !['admin', 'billing'].includes(user.role)
        )
          fail(
            'Recording payment requires the billing role.',
            'تسجيل الدفع يتطلب صلاحية الفوترة.',
            403,
          );
        r.status = action.status;
        r.version++;
        this.saveRecord(r);
        entity = r.id;
      } else if (action.action === 'settings') {
        if (user.role !== 'admin')
          fail('Administrator access required.', 'صلاحية المدير مطلوبة.', 403);
        this.db
          .prepare('UPDATE meta SET value=? WHERE key=?')
          .run(JSON.stringify(action.payload), 'settings');
        entity = 'settings';
      } else if (action.action === 'password') {
        const row = this.db.prepare('SELECT password FROM users WHERE id=?').get(user.id) as {
          password: string;
        };
        if (!checkPassword(action.currentPassword, row.password))
          fail('Current password is incorrect.', 'كلمة المرور الحالية غير صحيحة.', 403);
        this.db
          .prepare('UPDATE users SET password=? WHERE id=?')
          .run(hashPassword(action.newPassword), user.id);
        this.db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
        entity = 'credentials';
      }
      const detail =
        action.action === 'transition'
          ? action.status
          : action.action === 'update-record'
            ? `Version ${action.version + 1}`
            : 'Saved / تم الحفظ';
      this.audit(user.id, action.action, entity, detail);
      this.db.exec('COMMIT');
      return { id: entity };
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
const globalStore = globalThis as unknown as { shamStore?: HospitalStore };
export function getStore() {
  return (globalStore.shamStore ??= new HospitalStore(
    process.env.SHAM_DB_PATH ?? join(process.cwd(), 'data', 'sham.sqlite'),
    process.env.SHAM_DEMO_MODE === 'true',
    process.env.SHAM_ADMIN_PASSWORD,
  ));
}
