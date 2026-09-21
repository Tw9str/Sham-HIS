'use client';
import { useState } from 'react';
import { canWrite, moduleById, tr, type ModuleId } from '@/lib/catalog';
import {
  Avatar,
  Badge,
  Empty,
  Icon,
  PatientName,
  downloadCSV,
  formatMoney,
  localDate,
  useHospital,
} from './ui';
export function Patients() {
  const { snapshot: s, t, create, openPatient } = useHospital();
  const [query, setQuery] = useState('');
  const [sex, setSex] = useState('all');
  const rows = s.patients.filter(
    (p) =>
      (sex === 'all' || p.sex === sex) &&
      `${p.name} ${p.nameAr} ${p.id} ${p.phone}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {t('PEOPLE AT THE HEART OF CARE', 'الإنسان في قلب الرعاية')}
          </div>
          <h1>{t('Patient directory', 'سجل المرضى')}</h1>
          <p>
            {t('One identity. A connected lifetime of care.', 'هوية واحدة. رعاية متصلة عبر الزمن.')}
          </p>
        </div>
        {['admin', 'reception', 'doctor', 'nurse'].includes(s.user.role) && (
          <button className="button primary" onClick={() => create('patients')}>
            <Icon name="Plus" />
            {t('Register patient', 'تسجيل مريض')}
          </button>
        )}
      </div>
      <div className="directory-summary">
        <div className="metric-icon mint">
          <Icon name="Users" size={24} />
        </div>
        <div>
          <strong>{s.patients.length}</strong>
          <span>{t('registered patients', 'مريضًا مسجلًا')}</span>
        </div>
        <div className="directory-summary-note">
          <Icon name="ShieldCheck" />
          {t('A single record across every department', 'سجل واحد عبر جميع الأقسام')}
        </div>
      </div>
      <section className="card">
        <div className="toolbar">
          <label className="search-field">
            <Icon name="Search" size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Search name, MRN, or phone…', 'ابحث بالاسم أو رقم الملف أو الهاتف…')}
              aria-label={t('Search patients', 'البحث عن المرضى')}
            />
          </label>
          <select
            aria-label={t('Filter by sex', 'تصفية حسب الجنس')}
            value={sex}
            onChange={(e) => setSex(e.target.value)}
          >
            <option value="all">{t('All patients', 'جميع المرضى')}</option>
            <option value="female">{t('Female', 'أنثى')}</option>
            <option value="male">{t('Male', 'ذكر')}</option>
            <option value="other">{t('Other', 'آخر')}</option>
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t('Patient', 'المريض')}</th>
                <th>{t('Age / sex', 'العمر / الجنس')}</th>
                <th>{t('Contact', 'التواصل')}</th>
                <th>{t('Blood group', 'زمرة الدم')}</th>
                <th>{t('Allergies', 'الحساسيات')}</th>
                <th>{t('Record', 'الملف')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={p.id}>
                  <td>
                    <button className="cell-button" onClick={() => openPatient(p)}>
                      <PatientName patient={p} index={i} />
                    </button>
                  </td>
                  <td>
                    {age(p.dob)} {t('years', 'سنة')}
                    <small className="cell-sub">
                      {p.sex === 'female'
                        ? t('Female', 'أنثى')
                        : p.sex === 'male'
                          ? t('Male', 'ذكر')
                          : t('Other', 'آخر')}
                    </small>
                  </td>
                  <td dir="ltr" className="mono">
                    {p.phone}
                  </td>
                  <td>
                    <span className="blood-chip">
                      {p.blood === 'Unknown' ? t('Unknown', 'غير معروف') : p.blood}
                    </span>
                  </td>
                  <td>
                    {['reception', 'billing'].includes(s.user.role) ? (
                      t('Restricted', 'مقيّد')
                    ) : p.allergies ? (
                      <span className="allergy-inline">{p.allergies}</span>
                    ) : (
                      <span className="muted">{t('None recorded', 'لا يوجد توثيق')}</span>
                    )}
                  </td>
                  <td>
                    <button className="text-button" onClick={() => openPatient(p)}>
                      {t('Open chart', 'فتح الملف')}
                      <Icon name="ArrowUpRight" size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty
            title={t('No patients found', 'لم يتم العثور على مرضى')}
            description={t(
              'Try a different name or register a patient.',
              'جرّب اسمًا آخر أو سجّل مريضًا جديدًا.',
            )}
          />
        )}
        <div className="table-footer">
          {rows.length} {t('patients', 'مرضى')}
          <span>
            {t('Search across English and Arabic names', 'البحث بالأسماء العربية والإنجليزية')}
          </span>
        </div>
      </section>
    </>
  );
}
export function age(dob: string) {
  const today = new Date();
  const birth = new Date(dob + 'T12:00:00');
  return (
    today.getFullYear() -
    birth.getFullYear() -
    (today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
      ? 1
      : 0)
  );
}
export function ModuleView({ id }: { id: ModuleId }) {
  const { snapshot: s, lang, t, create, openRecord } = useHospital();
  const mod = moduleById(id)!;
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [date, setDate] = useState('');
  const [board, setBoard] = useState(id === 'admissions');
  const records = s.records.filter((r) => r.module === id);
  const rows = records
    .filter((r) => {
      const p = s.patients.find((p) => p.id === r.patientId);
      return (
        (status === 'all' || r.status === status) &&
        (!date || r.date === date) &&
        `${r.id} ${r.title} ${r.titleAr} ${p?.name ?? ''} ${p?.nameAr ?? ''} ${r.patientId} ${Object.values(r.data).join(' ')}`
          .toLowerCase()
          .includes(query.toLowerCase())
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time));
  const active = records.filter(
    (r) =>
      ![
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
      ].includes(r.status),
  );
  const low = records.filter(
    (r) => r.module === 'inventory' && Number(r.data.quantity) <= Number(r.data.reorder),
  );
  function exportRows() {
    downloadCSV(`${id}.csv`, [
      [
        t('Reference', 'المرجع'),
        t('Title', 'العنوان'),
        t('Patient', 'المريض'),
        t('Status', 'الحالة'),
        t('Date', 'التاريخ'),
        ...mod.fields.map((f) => f.label[lang]),
      ],
      ...rows.map((r) => [
        r.id,
        lang === 'ar' ? r.titleAr : r.title,
        r.patientId,
        tr(r.status, lang),
        r.date,
        ...mod.fields.map((f) => r.data[f.key] ?? ''),
      ]),
    ]);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {mod.group === 'care'
              ? t('CONNECTED PATIENT CARE', 'رعاية مرضى متصلة')
              : t('HOSPITAL OPERATIONS', 'عمليات المستشفى')}
          </div>
          <h1>{mod.name[lang]}</h1>
          <p>{mod.description[lang]}</p>
        </div>
        <div className="heading-actions">
          <button className="button" onClick={exportRows}>
            <Icon name="Download" />
            {t('Export', 'تصدير')}
          </button>
          {canWrite(s.user.role, id) && (
            <button className="button primary" onClick={() => create(id)}>
              <Icon name="Plus" />
              {t('New', 'إضافة')} {mod.singular[lang]}
            </button>
          )}
        </div>
      </div>
      <div className="mini-metrics">
        <div>
          <span className="metric-icon mint">
            <Icon name={mod.icon} />
          </span>
          <div>
            <strong>{records.length}</strong>
            <small>{t('Total records', 'إجمالي السجلات')}</small>
          </div>
        </div>
        <div>
          <span className="metric-icon blue">
            <Icon name="Clock3" />
          </span>
          <div>
            <strong>{active.length}</strong>
            <small>{t('Active work', 'العمل النشط')}</small>
          </div>
        </div>
        <div>
          <span className="metric-icon peach">
            <Icon name={id === 'inventory' ? 'Package' : 'Activity'} />
          </span>
          <div>
            <strong>
              {id === 'inventory'
                ? low.length
                : active.filter((r) => r.priority !== 'routine').length}
            </strong>
            <small>
              {id === 'inventory'
                ? t('Below reorder level', 'دون حد إعادة الطلب')
                : t('Priority items', 'العناصر ذات الأولوية')}
            </small>
          </div>
        </div>
        {id === 'billing' && (
          <div>
            <span className="metric-icon violet">
              <Icon name="Wallet" />
            </span>
            <div>
              <strong>
                {formatMoney(
                  records
                    .filter((r) => r.status === 'paid')
                    .reduce((a, r) => a + Number(r.data.amount), 0),
                  lang,
                )}
              </strong>
              <small>{t('Recorded payments', 'المدفوعات المسجلة')}</small>
            </div>
          </div>
        )}
      </div>
      {id === 'admissions' && (
        <div className="view-switch">
          <button className={board ? 'active' : ''} onClick={() => setBoard(true)}>
            <Icon name="BedDouble" />
            {t('Bed board', 'لوحة الأسرة')}
          </button>
          <button className={!board ? 'active' : ''} onClick={() => setBoard(false)}>
            <Icon name="FileText" />
            {t('Admission list', 'قائمة الدخول')}
          </button>
        </div>
      )}
      {id === 'admissions' && board ? (
        <section className="card bed-section">
          <div className="card-heading">
            <div>
              <h2>{t('Hospital bed board', 'لوحة أسرة المستشفى')}</h2>
              <p>
                {t(
                  '24 beds · 4 wards · select a bed to view or admit',
                  '24 سريرًا · 4 أجنحة · اختر سريرًا للعرض أو التنويم',
                )}
              </p>
            </div>
            <span className="legend">
              <i />
              {t('Occupied', 'مشغول')}
            </span>
          </div>
          <div className="bed-grid">
            {Array.from({ length: 24 }, (_, i) => {
              const bed = `B-${String(i + 1).padStart(2, '0')}`;
              const r = records.find((r) => r.status === 'admitted' && r.data.bed === bed);
              const p = s.patients.find((p) => p.id === r?.patientId);
              return (
                <button
                  className={`bed-tile ${r ? 'occupied' : ''}`}
                  key={bed}
                  onClick={() =>
                    r
                      ? openRecord(r)
                      : canWrite(s.user.role, id)
                        ? create(`admissions:${bed}`)
                        : undefined
                  }
                  disabled={!r && !canWrite(s.user.role, id)}
                >
                  <div>
                    <span className="mono">{bed}</span>
                    <Icon name="BedDouble" />
                  </div>
                  <strong>
                    {r ? (lang === 'ar' ? p?.nameAr : p?.name) : t('Available', 'متاح')}
                  </strong>
                  <small>
                    {r ? tr(r.data.ward, lang) : t('Ready for admission', 'جاهز للتنويم')}
                  </small>
                  <span className={`bed-state ${r ? 'taken' : ''}`}>
                    <i />
                    {r ? t('Occupied', 'مشغول') : t('Available', 'متاح')}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="card">
          <div className="status-tabs">
            <button className={status === 'all' ? 'active' : ''} onClick={() => setStatus('all')}>
              {t('All records', 'جميع السجلات')}
              <span>{records.length}</span>
            </button>
            {mod.states.map((state) => (
              <button
                key={state}
                className={status === state ? 'active' : ''}
                onClick={() => setStatus(state)}
              >
                {tr(state, lang)}
                <span>{records.filter((r) => r.status === state).length}</span>
              </button>
            ))}
          </div>
          <div className="toolbar">
            <label className="search-field">
              <Icon name="Search" size={17} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t(
                  'Search records, patients, references…',
                  'ابحث بالسجل أو المريض أو المرجع…',
                )}
                aria-label={t('Search records', 'البحث عن السجلات')}
              />
            </label>
            <label className="date-filter">
              <Icon name="CalendarDays" size={16} />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label={t('Filter by date', 'تصفية حسب التاريخ')}
              />
            </label>
            {date && (
              <button className="text-button" onClick={() => setDate('')}>
                {t('Clear', 'مسح')}
              </button>
            )}
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>
                    {mod.patient
                      ? t('Patient / reference', 'المريض / المرجع')
                      : t('Item / reference', 'الصنف / المرجع')}
                  </th>
                  <th>{t('Details', 'التفاصيل')}</th>
                  <th>
                    {id === 'inventory'
                      ? t('Stock level', 'مستوى المخزون')
                      : t('Assigned to', 'المسؤول')}
                  </th>
                  <th>
                    {['billing', 'insurance', 'procurement'].includes(id)
                      ? t('Amount', 'المبلغ')
                      : id === 'inventory'
                        ? t('Expiry', 'الصلاحية')
                        : t('Date / time', 'التاريخ / الوقت')}
                  </th>
                  <th>{t('Status', 'الحالة')}</th>
                  <th>{t('Priority', 'الأولوية')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const user = s.users.find((u) => u.id === r.assignedTo);
                  return (
                    <tr key={r.id}>
                      <td>
                        <button className="cell-button" onClick={() => openRecord(r)}>
                          {mod.patient ? (
                            <PatientName
                              patient={s.patients.find((p) => p.id === r.patientId)}
                              sub={r.id}
                              index={i}
                            />
                          ) : (
                            <div className="identity">
                              <span className="item-icon">
                                <Icon name={mod.icon} />
                              </span>
                              <div>
                                <strong>{lang === 'ar' ? r.titleAr : r.title}</strong>
                                <small>{r.id}</small>
                              </div>
                            </div>
                          )}
                        </button>
                      </td>
                      <td className="detail-cell">
                        <span className="table-primary">
                          {mod.patient
                            ? lang === 'ar'
                              ? r.titleAr
                              : r.title
                            : tr(r.data[mod.fields[0].key] ?? '', lang)}
                        </span>
                        <small className="cell-sub">
                          {mod.patient
                            ? tr(r.data[mod.fields[0].key] ?? '', lang)
                            : (r.data.location ?? r.data.supplier ?? tr(r.data.shift ?? '', lang))}
                        </small>
                      </td>
                      <td>
                        {id === 'inventory' ? (
                          <span
                            className={
                              Number(r.data.quantity) <= Number(r.data.reorder)
                                ? 'stock-low'
                                : 'stock-ok'
                            }
                          >
                            {r.data.quantity} {tr(r.data.unit, lang)}{' '}
                            {Number(r.data.quantity) <= Number(r.data.reorder) && (
                              <Icon name="ArrowDownLeft" size={14} />
                            )}
                          </span>
                        ) : (
                          <span>{lang === 'ar' ? user?.nameAr : user?.name}</span>
                        )}
                      </td>
                      <td>
                        {['billing', 'insurance', 'procurement'].includes(id) ? (
                          <strong className="money">
                            {formatMoney(Number(r.data.amount), lang)}
                          </strong>
                        ) : (
                          <>
                            <span className="table-primary">
                              {localDate(id === 'inventory' ? r.data.expiry : r.date, lang)}
                            </span>
                            {id !== 'inventory' && (
                              <small className="cell-sub mono">{r.time}</small>
                            )}
                          </>
                        )}
                      </td>
                      <td>
                        <Badge value={r.status} />
                      </td>
                      <td>
                        <Badge value={r.priority} />
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          onClick={() => openRecord(r)}
                          aria-label={t('Open record', 'فتح السجل')}
                        >
                          <Icon name="ChevronRight" size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!rows.length && (
            <Empty
              title={t('No records to show', 'لا توجد سجلات للعرض')}
              description={t(
                'Change the filters or create a new record.',
                'غيّر عوامل التصفية أو أنشئ سجلًا جديدًا.',
              )}
            />
          )}
          <div className="table-footer">
            {rows.length} {t('records', 'سجلات')}
            <span>
              {t('Changes are recorded in the audit trail', 'يتم توثيق التغييرات في سجل التدقيق')}
            </span>
          </div>
        </section>
      )}
    </>
  );
}
export function AuditView() {
  const { snapshot: s, lang, t } = useHospital();
  const [query, setQuery] = useState('');
  const rows = s.audit.filter((r) =>
    `${r.actor} ${r.action} ${r.entity} ${r.detail}`.toLowerCase().includes(query.toLowerCase()),
  );
  const actions: Record<string, string> = {
    'create-record': t('Record created', 'إنشاء سجل'),
    'update-record': t('Record updated', 'تعديل سجل'),
    'create-patient': t('Patient registered', 'تسجيل مريض'),
    'update-patient': t('Patient updated', 'تعديل مريض'),
    transition: t('Status changed', 'تغيير الحالة'),
    'sign-in': t('Signed in', 'تسجيل الدخول'),
    'sign-out': t('Signed out', 'تسجيل الخروج'),
    settings: t('Settings changed', 'تغيير الإعدادات'),
    password: t('Password changed', 'تغيير كلمة المرور'),
    initialized: t('Workspace initialized', 'تهيئة مساحة العمل'),
    'stock-dispensed': t('Stock dispensed', 'صرف مخزون'),
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{t('ACCOUNTABILITY BY DESIGN', 'المساءلة جزء من التصميم')}</div>
          <h1>{t('Audit trail', 'سجل التدقيق')}</h1>
          <p>
            {t(
              'The latest 300 events, with an actor and timestamp.',
              'آخر 300 حدث مع الموظف والتوقيت.',
            )}
          </p>
        </div>
        <button
          className="button"
          onClick={() =>
            downloadCSV('audit.csv', [
              ['Time', 'Actor', 'Action', 'Entity', 'Detail'],
              ...rows.map((r) => [r.at, r.actor, r.action, r.entity, r.detail]),
            ])
          }
        >
          <Icon name="Download" />
          {t('Export', 'تصدير')}
        </button>
      </div>
      <section className="card">
        <div className="toolbar">
          <label className="search-field">
            <Icon name="Search" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Search events…', 'ابحث في الأحداث…')}
              aria-label={t('Search audit trail', 'البحث في سجل التدقيق')}
            />
          </label>
          <span className="legend">
            <Icon name="ShieldCheck" />
            {t('Read-only history', 'سجل للقراءة فقط')}
          </span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  t('Event', 'الحدث'),
                  t('Actor', 'الموظف'),
                  t('Reference', 'المرجع'),
                  t('Details', 'التفاصيل'),
                  t('Timestamp', 'التوقيت'),
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const u = s.users.find((u) => u.id === r.actor);
                return (
                  <tr key={r.id}>
                    <td>
                      <strong>{actions[r.action] ?? r.action}</strong>
                    </td>
                    <td>{u ? (lang === 'ar' ? u.nameAr : u.name) : t('System', 'النظام')}</td>
                    <td className="mono">{r.entity}</td>
                    <td>{tr(r.detail, lang)}</td>
                    <td>
                      {new Date(r.at).toLocaleString(lang === 'ar' ? 'ar-SY-u-nu-latn' : 'en-GB')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && <Empty title={t('No matching events', 'لا توجد أحداث مطابقة')} />}
      </section>
    </>
  );
}
export function SettingsView() {
  const { snapshot: s, lang, t, mutate, busy } = useHospital();
  const [tab, setTab] = useState('hospital');
  const [form, setForm] = useState(s.settings);
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{t('YOUR WORKSPACE', 'مساحة عملك')}</div>
          <h1>{t('Settings', 'الإعدادات')}</h1>
          <p>
            {t(
              'Hospital identity, account security, and access overview.',
              'هوية المستشفى وأمان الحساب ونظرة عامة على الصلاحيات.',
            )}
          </p>
        </div>
      </div>
      <div className="settings-layout">
        <nav className="settings-nav">
          {[
            { id: 'hospital', en: 'Hospital profile', ar: 'ملف المستشفى', icon: 'HeartPulse' },
            { id: 'team', en: 'Team & access', ar: 'الفريق والصلاحيات', icon: 'UsersRound' },
            { id: 'security', en: 'Account security', ar: 'أمان الحساب', icon: 'ShieldCheck' },
            { id: 'integrations', en: 'Integrations', ar: 'التكاملات', icon: 'Activity' },
          ].map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? 'active' : ''}
              onClick={() => setTab(item.id)}
            >
              <Icon name={item.icon} />
              {t(item.en, item.ar)}
            </button>
          ))}
        </nav>
        <section className="card settings-content">
          {tab === 'hospital' && (
            <>
              <div className="card-heading">
                <div>
                  <h2>{t('Hospital profile', 'ملف المستشفى')}</h2>
                  <p>
                    {t('Your identity across the workspace.', 'هويتك في جميع أنحاء مساحة العمل.')}
                  </p>
                </div>
                <span className="brand-symbol small-brand">✚</span>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await mutate({ action: 'settings', payload: form });
                }}
              >
                <div className="form-grid">
                  {[
                    { key: 'name', en: 'Name in English', ar: 'الاسم بالإنجليزية' },
                    { key: 'nameAr', en: 'Name in Arabic', ar: 'الاسم بالعربية' },
                    { key: 'address', en: 'Address', ar: 'العنوان' },
                    { key: 'phone', en: 'Phone', ar: 'الهاتف' },
                  ].map((f) => (
                    <label className="field" key={f.key}>
                      {t(f.en, f.ar)}
                      <input
                        required={f.key.startsWith('name')}
                        value={form[f.key] ?? ''}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        disabled={s.user.role !== 'admin'}
                        maxLength={f.key === 'address' ? 300 : 100}
                      />
                    </label>
                  ))}
                </div>
                <div className="form-footer">
                  <span>
                    {t(
                      'Currency: USD · configured for this evaluation',
                      'العملة: دولار أمريكي · مهيأة لهذا التقييم',
                    )}
                  </span>
                  {s.user.role === 'admin' && (
                    <button className="button primary" disabled={busy}>
                      {t('Save changes', 'حفظ التغييرات')}
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
          {tab === 'team' && (
            <>
              <div className="card-heading">
                <div>
                  <h2>{t('Team & access', 'الفريق والصلاحيات')}</h2>
                  <p>
                    {t(
                      'Roles are enforced by the server. Account provisioning is not yet exposed in the UI.',
                      'الصلاحيات مطبقة على الخادم. إنشاء الحسابات غير متاح بعد عبر الواجهة.',
                    )}
                  </p>
                </div>
              </div>
              <div className="team-list">
                {s.users.map((u, i) => (
                  <div key={u.id}>
                    <Avatar name={lang === 'ar' ? u.nameAr : u.name} index={i} />
                    <div>
                      <strong>{lang === 'ar' ? u.nameAr : u.name}</strong>
                      <small>{u.email}</small>
                    </div>
                    <span className="role-tag">{tr(u.role, lang)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {tab === 'security' && (
            <>
              <div className="card-heading">
                <div>
                  <h2>{t('Change password', 'تغيير كلمة المرور')}</h2>
                  <p>
                    {t(
                      'Use at least 12 characters. Changing your password signs out all sessions.',
                      'استخدم 12 محرفًا على الأقل. تغيير كلمة المرور ينهي جميع الجلسات.',
                    )}
                  </p>
                </div>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await mutate({ action: 'password', currentPassword, newPassword });
                }}
              >
                <div className="form-grid single">
                  <label className="field">
                    {t('Current password', 'كلمة المرور الحالية')}
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrent(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    {t('New password', 'كلمة المرور الجديدة')}
                    <input
                      type="password"
                      required
                      minLength={12}
                      maxLength={200}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNew(e.target.value)}
                    />
                  </label>
                </div>
                <div className="form-footer">
                  <button className="button primary" disabled={busy}>
                    {t('Update password', 'تحديث كلمة المرور')}
                  </button>
                </div>
              </form>
            </>
          )}
          {tab === 'integrations' && (
            <>
              <div className="card-heading">
                <div>
                  <h2>{t('Integration readiness', 'جاهزية التكامل')}</h2>
                  <p>
                    {t(
                      'These connections require implementation and hospital-specific configuration.',
                      'تتطلب هذه الاتصالات تنفيذًا وتهيئة خاصة بالمستشفى.',
                    )}
                  </p>
                </div>
              </div>
              <div className="integration-list">
                {[
                  {
                    en: 'Laboratory instruments / LIS',
                    ar: 'أجهزة المختبر / نظام المختبر',
                    icon: 'FlaskConical',
                  },
                  {
                    en: 'PACS / DICOM imaging',
                    ar: 'أرشفة الصور الطبية / DICOM',
                    icon: 'ScanLine',
                  },
                  { en: 'FHIR / HL7 exchange', ar: 'تبادل FHIR / HL7', icon: 'Activity' },
                  {
                    en: 'Insurance clearinghouse',
                    ar: 'بوابة مطالبات التأمين',
                    icon: 'ShieldCheck',
                  },
                  {
                    en: 'Identity provider / SSO',
                    ar: 'موفر الهوية / الدخول الموحد',
                    icon: 'UsersRound',
                  },
                  { en: 'Payment gateway', ar: 'بوابة الدفع', icon: 'Wallet' },
                ].map((i) => (
                  <div key={i.en}>
                    <span className="item-icon">
                      <Icon name={i.icon} />
                    </span>
                    <strong>{t(i.en, i.ar)}</strong>
                    <span className="integration-status">{t('Not connected', 'غير متصل')}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
