'use client';
import { useState } from 'react';
import { canWrite, moduleById, modules, tr, type Patient, type WorkRecord } from '@/lib/catalog';
import { Avatar, Badge, Empty, Icon, Modal, localDate, useHospital } from './ui';
import { age } from './views';
export type DialogState =
  | { kind: 'patient'; id: string }
  | { kind: 'record'; id: string }
  | { kind: 'create'; module: string; patientId?: string }
  | { kind: 'edit-patient'; id: string };
export function WorkspaceDialog({
  dialog,
  close,
  editPatient,
}: {
  dialog: DialogState;
  close: () => void;
  editPatient: (id: string) => void;
}) {
  const { snapshot: s } = useHospital();
  if (dialog.kind === 'create')
    return dialog.module === 'patients' ? (
      <PatientForm close={close} />
    ) : (
      <RecordForm module={dialog.module} patientId={dialog.patientId} close={close} />
    );
  if (dialog.kind === 'patient') {
    const p = s.patients.find((p) => p.id === dialog.id);
    return p ? <PatientChart patient={p} close={close} edit={() => editPatient(p.id)} /> : null;
  }
  if (dialog.kind === 'edit-patient') {
    const p = s.patients.find((p) => p.id === dialog.id);
    return p ? <PatientForm patient={p} close={close} /> : null;
  }
  const r = s.records.find((r) => r.id === dialog.id);
  return r ? <RecordDetail record={r} close={close} /> : null;
}
function PatientForm({ patient, close }: { patient?: Patient; close: () => void }) {
  const { t, mutate, busy, snapshot: s } = useHospital();
  const [form, setForm] = useState({
    name: patient?.name ?? '',
    nameAr: patient?.nameAr ?? '',
    dob: patient?.dob ?? '',
    sex: patient?.sex ?? 'female',
    phone: patient?.phone ?? '',
    blood: patient?.blood ?? 'Unknown',
    allergies: patient?.allergies ?? '',
    address: patient?.address ?? '',
  });
  const set = (key: string, value: string) => setForm({ ...form, [key]: value });
  return (
    <Modal
      title={patient ? t('Edit patient', 'تعديل المريض') : t('Register a patient', 'تسجيل مريض')}
      description={t(
        'A single patient identity across the hospital.',
        'هوية واحدة للمريض عبر جميع أقسام المستشفى.',
      )}
      onClose={close}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await mutate({
              action: patient ? 'update-patient' : 'create-patient',
              id: patient?.id,
              payload: form,
            })
          )
            close();
        }}
      >
        <div className="form-grid">
          <label className="field">
            {t('Full name in English', 'الاسم الكامل بالإنجليزية')}
            <input
              required
              minLength={2}
              maxLength={100}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              autoFocus
              dir="ltr"
            />
          </label>
          <label className="field">
            {t('Full name in Arabic', 'الاسم الكامل بالعربية')}
            <input
              required
              minLength={2}
              maxLength={100}
              value={form.nameAr}
              onChange={(e) => set('nameAr', e.target.value)}
              dir="rtl"
            />
          </label>
          <label className="field">
            {t('Date of birth', 'تاريخ الميلاد')}
            <input
              type="date"
              required
              max={new Date().toISOString().slice(0, 10)}
              value={form.dob}
              onChange={(e) => set('dob', e.target.value)}
            />
          </label>
          <label className="field">
            {t('Sex', 'الجنس')}
            <select value={form.sex} onChange={(e) => set('sex', e.target.value)}>
              <option value="female">{t('Female', 'أنثى')}</option>
              <option value="male">{t('Male', 'ذكر')}</option>
              <option value="other">{t('Other', 'آخر')}</option>
            </select>
          </label>
          <label className="field">
            {t('Phone', 'الهاتف')}
            <input
              type="tel"
              required
              minLength={5}
              maxLength={30}
              dir="ltr"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
          </label>
          <label className="field">
            {t('Blood group', 'زمرة الدم')}
            <select
              value={form.blood}
              disabled={s.user.role === 'reception'}
              onChange={(e) => set('blood', e.target.value)}
            >
              {['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((v) => (
                <option key={v} value={v}>
                  {v === 'Unknown' ? t('Unknown', 'غير معروف') : v}
                </option>
              ))}
            </select>
          </label>
          <label className="field span-two">
            {t('Allergies (leave blank if not recorded)', 'الحساسيات (اتركه فارغًا إن لم تُوثق)')}
            <input
              maxLength={1000}
              value={form.allergies}
              disabled={s.user.role === 'reception'}
              onChange={(e) => set('allergies', e.target.value)}
            />
          </label>
          <label className="field span-two">
            {t('Address', 'العنوان')}
            <input
              maxLength={300}
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
            />
          </label>
        </div>
        <div className="form-footer">
          <button type="button" className="button" onClick={close}>
            {t('Cancel', 'إلغاء')}
          </button>
          <button className="button primary" disabled={busy}>
            {busy
              ? t('Saving…', 'جارٍ الحفظ…')
              : patient
                ? t('Save patient', 'حفظ المريض')
                : t('Register patient', 'تسجيل المريض')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function RecordForm({
  module,
  patientId,
  record,
  close,
}: {
  module: string;
  patientId?: string;
  record?: WorkRecord;
  close: () => void;
}) {
  const { snapshot: s, lang, t, mutate, busy } = useHospital();
  const [moduleId, bed] = module.split(':');
  const mod = moduleById(moduleId)!;
  const defaults = Object.fromEntries(
    mod.fields.map((f) => [f.key, f.key === 'bed' && bed ? bed : (f.options?.[0] ?? '')]),
  );
  const [form, setForm] = useState({
    module: mod.id,
    title: record?.title ?? '',
    titleAr: record?.titleAr ?? '',
    patientId: record?.patientId ?? patientId ?? '',
    assignedTo:
      record?.assignedTo ?? s.users.find((u) => mod.roles.includes(u.role))?.id ?? s.user.id,
    priority: record?.priority ?? 'routine',
    date: record?.date ?? new Date().toISOString().slice(0, 10),
    time: record?.time ?? '09:00',
    data: record?.data ?? defaults,
  });
  const set = (key: string, value: string) => setForm({ ...form, [key]: value });
  return (
    <Modal
      title={`${record ? t('Edit', 'تعديل') : t('New', 'إضافة')} ${mod.singular[lang]}`}
      description={mod.description[lang]}
      onClose={close}
      wide
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await mutate({
              action: record ? 'update-record' : 'create-record',
              id: record?.id,
              version: record?.version,
              payload: form,
            })
          )
            close();
        }}
      >
        <div className="form-grid">
          {mod.patient && (
            <label className="field span-two">
              {t('Patient', 'المريض')}
              <select
                required
                disabled={!!record}
                value={form.patientId}
                onChange={(e) => set('patientId', e.target.value)}
              >
                <option value="">{t('Select a patient…', 'اختر مريضًا…')}</option>
                {s.patients.map((p) => (
                  <option value={p.id} key={p.id}>
                    {lang === 'ar' ? p.nameAr : p.name} · {p.id}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            {t('Title in English', 'العنوان بالإنجليزية')}
            <input
              required
              minLength={2}
              maxLength={150}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              dir="ltr"
            />
          </label>
          <label className="field">
            {t('Title in Arabic', 'العنوان بالعربية')}
            <input
              required
              minLength={2}
              maxLength={150}
              value={form.titleAr}
              onChange={(e) => set('titleAr', e.target.value)}
              dir="rtl"
            />
          </label>
          <label className="field">
            {t('Assigned to', 'المسؤول')}
            <select value={form.assignedTo} onChange={(e) => set('assignedTo', e.target.value)}>
              {s.users.map((u) => (
                <option value={u.id} key={u.id}>
                  {lang === 'ar' ? u.nameAr : u.name} · {tr(u.role, lang)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t('Priority', 'الأولوية')}
            <select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {['routine', 'urgent', 'critical'].map((v) => (
                <option value={v} key={v}>
                  {tr(v, lang)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t('Date', 'التاريخ')}
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </label>
          <label className="field">
            {t('Time', 'الوقت')}
            <input
              type="time"
              required
              value={form.time}
              onChange={(e) => set('time', e.target.value)}
            />
          </label>
          <div className="form-section-title span-two">
            <Icon name={mod.icon} />
            {t('Record details', 'تفاصيل السجل')}
          </div>
          {mod.fields.map((f) => (
            <label key={f.key} className={`field ${f.type === 'textarea' ? 'span-two' : ''}`}>
              {f.label[lang]}
              {f.type === 'select' ? (
                <select
                  required={f.required}
                  value={form.data[f.key] ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, data: { ...form.data, [f.key]: e.target.value } })
                  }
                >
                  {f.options?.map((o) => (
                    <option key={o} value={o}>
                      {tr(o, lang)}
                    </option>
                  ))}
                </select>
              ) : f.key === 'stockId' ? (
                <select
                  value={form.data[f.key] ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, data: { ...form.data, [f.key]: e.target.value } })
                  }
                >
                  <option value="">{t('Select stock to dispense…', 'اختر مخزونًا للصرف…')}</option>
                  {s.records
                    .filter((r) => r.module === 'inventory' && r.status === 'active')
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {lang === 'ar' ? r.titleAr : r.title} · {r.id} · {r.data.quantity}
                      </option>
                    ))}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea
                  required={f.required}
                  maxLength={5000}
                  rows={3}
                  value={form.data[f.key] ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, data: { ...form.data, [f.key]: e.target.value } })
                  }
                />
              ) : (
                <input
                  required={f.required}
                  type={f.type ?? 'text'}
                  min={f.type === 'number' ? 0 : undefined}
                  step={f.key === 'amount' ? '0.01' : f.type === 'number' ? '1' : undefined}
                  maxLength={5000}
                  value={form.data[f.key] ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, data: { ...form.data, [f.key]: e.target.value } })
                  }
                />
              )}
            </label>
          ))}
        </div>
        <div className="form-footer">
          <span className="form-note">
            <Icon name="ShieldCheck" size={14} />
            {t('Changes are audited', 'التغييرات موثقة')}
          </span>
          <button type="button" className="button" onClick={close}>
            {t('Cancel', 'إلغاء')}
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? t('Saving…', 'جارٍ الحفظ…') : t('Save record', 'حفظ السجل')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function RecordDetail({ record: r, close }: { record: WorkRecord; close: () => void }) {
  const { snapshot: s, lang, t, mutate, busy, openPatient } = useHospital();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState('');
  const mod = moduleById(r.module)!;
  const p = s.patients.find((p) => p.id === r.patientId);
  const u = s.users.find((u) => u.id === r.assignedTo);
  const terminal = [
    'completed',
    'cancelled',
    'signed',
    'verified',
    'dispensed',
    'paid',
    'void',
    'discharged',
    'received',
    'resolved',
    'inactive',
    'approved',
    'rejected',
  ].includes(r.status);
  const writable = canWrite(s.user.role, r.module);
  const next = mod.states[mod.states.indexOf(r.status) + 1];
  const options =
    !terminal && writable
      ? [
          next,
          ...(r.module === 'appointments'
            ? ['cancelled']
            : r.module === 'billing' && r.status !== 'paid'
              ? ['void']
              : r.module === 'insurance' && r.status === 'submitted'
                ? ['rejected']
                : []),
        ].filter((v, i, a) => v && a.indexOf(v) === i)
      : [];
  const permitted = options.filter(
    (status) =>
      !(
        r.module === 'pharmacy' &&
        status === 'dispensed' &&
        !['admin', 'pharmacist'].includes(s.user.role)
      ) &&
      !(r.module === 'billing' && status === 'paid' && !['admin', 'billing'].includes(s.user.role)),
  );
  if (editing) return <RecordForm module={r.module} record={r} close={() => setEditing(false)} />;
  return (
    <Modal
      title={lang === 'ar' ? r.titleAr : r.title}
      description={`${mod.name[lang]} · ${r.id}`}
      onClose={close}
      wide
    >
      <div className="record-detail">
        <div className="record-status-line">
          <Badge value={r.status} />
          <Badge value={r.priority} />
          <span>
            {t('Version', 'الإصدار')} {r.version}
          </span>
        </div>
        {p && (
          <button className="patient-link" onClick={() => openPatient(p)}>
            <Avatar name={lang === 'ar' ? p.nameAr : p.name} />
            <div>
              <strong>{lang === 'ar' ? p.nameAr : p.name}</strong>
              <small>
                {p.id} · {age(p.dob)} {t('years', 'سنة')}
              </small>
            </div>
            <Icon name="ArrowUpRight" />
          </button>
        )}
        {p?.allergies && (
          <div className="allergy-banner">
            <Icon name="ShieldCheck" />
            {t('Recorded allergies:', 'الحساسيات المسجلة:')} {p.allergies}
          </div>
        )}
        <div className="detail-meta">
          <div>
            <small>{t('Assigned to', 'المسؤول')}</small>
            <strong>{lang === 'ar' ? u?.nameAr : u?.name}</strong>
          </div>
          <div>
            <small>{t('Scheduled', 'الموعد')}</small>
            <strong>
              {localDate(r.date, lang)} · {r.time}
            </strong>
          </div>
        </div>
        <div className="detail-fields">
          {mod.fields.map((f) => (
            <div key={f.key}>
              <small>{f.label[lang]}</small>
              <p dir="auto">
                {r.data[f.key] ? tr(r.data[f.key], lang) : t('Not recorded', 'غير موثق')}
              </p>
            </div>
          ))}
        </div>
        {terminal && (
          <div className="info-strip">
            <Icon name="ShieldCheck" />
            {t('This record is finalized and read-only.', 'هذا السجل نهائي وللقراءة فقط.')}
          </div>
        )}
        {confirm && (
          <div className="confirmation">
            <strong>{t('Confirm status change', 'تأكيد تغيير الحالة')}</strong>
            <p>
              {t('Change this record to', 'تغيير حالة هذا السجل إلى')} «{tr(confirm, lang)}»?{' '}
              {['paid', 'dispensed', 'signed', 'discharged', 'verified'].includes(confirm) &&
                t('This action finalizes the record.', 'هذا الإجراء يجعل السجل نهائيًا.')}
            </p>
            <div>
              <button className="button" onClick={() => setConfirm('')}>
                {t('Cancel', 'إلغاء')}
              </button>
              <button
                className="button primary"
                disabled={busy}
                onClick={async () => {
                  if (
                    await mutate({
                      action: 'transition',
                      id: r.id,
                      version: r.version,
                      status: confirm,
                    })
                  )
                    setConfirm('');
                }}
              >
                {t('Confirm', 'تأكيد')}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="form-footer">
        <button className="button" onClick={() => window.print()}>
          <Icon name="Download" />
          {t('Print / PDF', 'طباعة / PDF')}
        </button>
        {writable && !terminal && !(r.module === 'billing' && r.status === 'issued') && (
          <button className="button" onClick={() => setEditing(true)}>
            {t('Edit details', 'تعديل التفاصيل')}
          </button>
        )}
        {!confirm &&
          permitted.map((status, i) => (
            <button
              key={status}
              className={`button ${i === 0 ? 'primary' : ''}`}
              onClick={() => setConfirm(status)}
              disabled={busy}
            >
              {tr(status, lang)}
              {i === 0 && <Icon name="ChevronRight" size={16} />}
            </button>
          ))}
      </div>
    </Modal>
  );
}
function PatientChart({
  patient: p,
  close,
  edit,
}: {
  patient: Patient;
  close: () => void;
  edit: () => void;
}) {
  const { snapshot: s, lang, t, create, openRecord } = useHospital();
  const [tab, setTab] = useState('summary');
  const records = s.records
    .filter((r) => r.patientId === p.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const encounters = records.filter((r) => r.module === 'encounters');
  const tabs = [
    { id: 'summary', en: 'Overview', ar: 'نظرة عامة' },
    { id: 'encounters', en: 'Encounters', ar: 'الزيارات' },
    { id: 'laboratory', en: 'Results', ar: 'النتائج' },
    { id: 'pharmacy', en: 'Medications', ar: 'الأدوية' },
    { id: 'billing', en: 'Billing', ar: 'الفواتير' },
  ].filter(
    (tab) =>
      tab.id === 'summary' || s.user.role === 'admin' || records.some((r) => r.module === tab.id),
  );
  const activeRows =
    tab === 'summary'
      ? records
      : records.filter(
          (r) => r.module === tab || (tab === 'laboratory' && r.module === 'radiology'),
        );
  return (
    <Modal title={t('Patient chart', 'ملف المريض')} description={p.id} onClose={close} wide>
      <div className="patient-chart-header">
        <Avatar name={lang === 'ar' ? p.nameAr : p.name} />
        <div>
          <h2>{lang === 'ar' ? p.nameAr : p.name}</h2>
          <p>
            {age(p.dob)} {t('years', 'سنة')} ·{' '}
            {p.sex === 'female'
              ? t('Female', 'أنثى')
              : p.sex === 'male'
                ? t('Male', 'ذكر')
                : t('Other', 'آخر')}{' '}
            · {p.blood === 'Unknown' ? t('Blood group unknown', 'زمرة الدم غير معروفة') : p.blood}
          </p>
        </div>
        {['admin', 'doctor', 'nurse'].includes(s.user.role) && (
          <button className="button" onClick={edit}>
            {t('Edit patient', 'تعديل المريض')}
          </button>
        )}
      </div>
      {p.allergies && (
        <div className="allergy-banner chart-allergy">
          <Icon name="ShieldCheck" />
          {t('Recorded allergies:', 'الحساسيات المسجلة:')} {p.allergies}
        </div>
      )}
      <div className="status-tabs">
        {tabs.map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? 'active' : ''}
            onClick={() => setTab(item.id)}
          >
            {t(item.en, item.ar)}
          </button>
        ))}
      </div>
      <div className="chart-content">
        {tab === 'summary' && (
          <>
            <div className="patient-facts">
              <div>
                <small>{t('Date of birth', 'تاريخ الميلاد')}</small>
                <strong>{localDate(p.dob, lang)}</strong>
              </div>
              <div>
                <small>{t('Phone', 'الهاتف')}</small>
                <strong dir="ltr">{p.phone}</strong>
              </div>
              <div>
                <small>{t('Address', 'العنوان')}</small>
                <strong>{p.address || '—'}</strong>
              </div>
            </div>
            {encounters[0] && (
              <div className="clinical-summary">
                <div>
                  <Icon name="HeartPulse" />
                  <h3>{t('Latest clinical summary', 'أحدث ملخص سريري')}</h3>
                </div>
                <p>
                  {encounters[0].data.vitals || t('No vitals recorded', 'لم تُسجل علامات حيوية')}
                </p>
                <strong>
                  {encounters[0].data.diagnosis || t('Diagnosis not recorded', 'لم يُوثق التشخيص')}
                </strong>
                <p>{encounters[0].data.assessment}</p>
              </div>
            )}
            <h3 className="timeline-heading">{t('Patient activity', 'نشاط المريض')}</h3>
          </>
        )}
        <div className="patient-timeline">
          {activeRows.map((r) => (
            <button key={r.id} onClick={() => openRecord(r)}>
              <span className="timeline-icon">
                <Icon name={modules.find((m) => m.id === r.module)?.icon ?? 'FileText'} />
              </span>
              <div>
                <strong>{lang === 'ar' ? r.titleAr : r.title}</strong>
                <small>
                  {localDate(r.date, lang)} · {r.id}
                </small>
              </div>
              <Badge value={r.status} />
              <Icon name="ChevronRight" size={15} />
            </button>
          ))}
        </div>
        {!activeRows.length && (
          <Empty title={t('No records in this section', 'لا توجد سجلات في هذا القسم')} />
        )}
      </div>
      <div className="form-footer">
        <button className="button" onClick={() => window.print()}>
          <Icon name="Download" />
          {t('Print chart', 'طباعة الملف')}
        </button>
        {canWrite(s.user.role, 'appointments') && (
          <button className="button" onClick={() => create('appointments', p.id)}>
            {t('Book appointment', 'حجز موعد')}
          </button>
        )}
        {canWrite(s.user.role, 'encounters') && (
          <button className="button primary" onClick={() => create('encounters', p.id)}>
            <Icon name="Plus" />
            {t('New encounter', 'زيارة جديدة')}
          </button>
        )}
      </div>
    </Modal>
  );
}
