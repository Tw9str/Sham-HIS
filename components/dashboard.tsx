'use client';
import { canRead, canWrite, modules, tr, type View } from '@/lib/catalog';
import { Badge, Icon, PatientName, useHospital, formatMoney, Avatar, Empty } from './ui';
export function Dashboard({ reports = false }: { reports?: boolean }) {
  const { snapshot: s, lang, t, navigate, create, openRecord } = useHospital();
  const today = new Date().toISOString().slice(0, 10);
  const appointments = s.records
    .filter((r) => r.module === 'appointments' && r.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));
  const admissions = s.records.filter((r) => r.module === 'admissions' && r.status === 'admitted');
  const invoices = s.records.filter((r) => r.module === 'billing');
  const paid =
    invoices
      .filter((r) => r.status === 'paid')
      .reduce((sum, r) => sum + Math.round(Number(r.data.amount) * 100), 0) / 100;
  const pending = s.records.filter(
    (r) =>
      ![
        'completed',
        'signed',
        'verified',
        'dispensed',
        'paid',
        'void',
        'cancelled',
        'discharged',
        'resolved',
        'inactive',
        'received',
        'approved',
        'rejected',
      ].includes(r.status),
  );
  const urgent = pending.filter((r) => r.priority !== 'routine').slice(0, 4);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const date = d.toISOString().slice(0, 10);
    return {
      date,
      label: d.toLocaleDateString(lang === 'ar' ? 'ar-SY-u-nu-latn' : 'en-US', {
        weekday: 'short',
      }),
      count: s.records.filter(
        (r) => r.module === 'appointments' && r.date === date && r.status !== 'cancelled',
      ).length,
    };
  });
  const max = Math.max(...days.map((d) => d.count), 5);
  const metrics = [
    {
      label: t('Registered patients', 'المرضى المسجلون'),
      value: s.patients.length,
      icon: 'Users',
      sub: t('Across your hospital', 'على مستوى المستشفى'),
      color: 'mint',
      view: 'patients',
    },
    {
      label: t('Appointments today', 'مواعيد اليوم'),
      value: appointments.length,
      icon: 'CalendarDays',
      sub: `${appointments.filter((r) => r.status === 'checked-in').length} ${t('checked in', 'تم حضورهم')}`,
      color: 'blue',
      view: 'appointments',
    },
    {
      label: t('Bed occupancy', 'إشغال الأسرة'),
      value: `${Math.round((admissions.length / 24) * 100)}%`,
      icon: 'BedDouble',
      sub: `${admissions.length} / 24 ${t('beds occupied', 'سريرًا مشغولًا')}`,
      color: 'violet',
      view: 'admissions',
    },
    {
      label: t('Recorded collections', 'التحصيلات المسجلة'),
      value: formatMoney(paid, lang),
      icon: 'Wallet',
      sub: t('Paid invoices · all dates', 'الفواتير المدفوعة · جميع التواريخ'),
      color: 'peach',
      view: 'billing',
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{t('YOUR HOSPITAL, CONNECTED', 'مستشفاك، متصل')}</div>
          <h1>
            {reports
              ? t('Reports & insights', 'التقارير والتحليلات')
              : t('Hospital overview', 'نظرة عامة على المستشفى')}
          </h1>
          <p>{t('A clearer picture. A better day of care.', 'رؤية أوضح. يوم أفضل للرعاية.')}</p>
        </div>
        <div className="heading-actions">
          <span className="date-chip">
            <Icon name="CalendarDays" />
            {new Date().toLocaleDateString(lang === 'ar' ? 'ar-SY-u-nu-latn' : 'en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          {['admin', 'reception', 'doctor', 'nurse'].includes(s.user.role) && (
            <button className="button primary" onClick={() => create('patients')}>
              <Icon name="Plus" />
              {t('Register patient', 'تسجيل مريض')}
            </button>
          )}
        </div>
      </div>
      {!reports && (
        <section className="welcome-banner">
          <div className="welcome-copy">
            <span className="live-pill">
              <i />
              {t('Care starts with connection', 'الرعاية تبدأ بالتواصل')}
            </span>
            <h2>
              {t('Welcome back,', 'أهلًا بعودتك،')}{' '}
              {lang === 'ar' ? s.user.nameAr.split(' ')[0] : s.user.name.split(' ')[0]}
              <span className="greeting-dot">.</span>
            </h2>
            <p>
              {t(
                'Your teams, your patients, and your priorities — together in one place.',
                'فرقك ومرضاك وأولوياتك، معًا في مكان واحد.',
              )}
            </p>
            <button
              className="text-button"
              onClick={() =>
                navigate(canRead(s.user.role, 'appointments') ? 'appointments' : 'patients')
              }
            >
              {t('Explore your workspace', 'استعرض مساحة عملك')}
              <Icon name="ArrowUpRight" size={16} />
            </button>
          </div>
          <div className="banner-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="art-cross">
              <span />
              <span />
            </div>
            <div className="floating-heart">
              <Icon name="HeartPulse" size={27} />
            </div>
            <div className="art-caption">
              <i />
              {t('Built around people', 'رعاية تتمحور حول الإنسان')}
            </div>
          </div>
        </section>
      )}
      <div className="metric-grid">
        {metrics
          .filter((m) => canRead(s.user.role, m.view))
          .map((m) => (
            <button className="metric-card" key={m.label} onClick={() => navigate(m.view as View)}>
              <div className="metric-top">
                <span>{m.label}</span>
                <span className={`metric-icon ${m.color}`}>
                  <Icon name={m.icon} />
                </span>
              </div>
              <strong className="metric-value" dir="auto">
                {m.value}
              </strong>
              <div className="metric-bottom">
                <span className="tiny-dot" />
                {m.sub}
                <Icon name="ArrowUpRight" size={15} />
              </div>
            </button>
          ))}
      </div>
      <div className="dashboard-columns">
        <div className="dashboard-main">
          {canRead(s.user.role, 'appointments') && (
            <section className="card">
              <div className="card-heading">
                <div>
                  <h2>{t('Patient visits', 'زيارات المرضى')}</h2>
                  <p>
                    {t(
                      'Scheduled appointments over the last 7 days',
                      'المواعيد المسجلة خلال آخر 7 أيام',
                    )}
                  </p>
                </div>
                <span className="legend">
                  <i />
                  {t('Appointments', 'المواعيد')}
                </span>
              </div>
              <div
                className="chart"
                role="img"
                aria-label={days.map((d) => `${d.label}: ${d.count}`).join(', ')}
              >
                <div className="chart-axis">
                  {[
                    max,
                    Math.round(max * 0.75),
                    Math.round(max * 0.5),
                    Math.round(max * 0.25),
                    0,
                  ].map((v, i) => (
                    <span key={i}>{v}</span>
                  ))}
                </div>
                <div className="chart-plot">
                  <div className="chart-grid">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  {days.map((d, i) => (
                    <div className="chart-column" key={d.date}>
                      <div
                        className={`chart-bar ${i === 6 ? 'current' : ''}`}
                        style={{ height: `${(d.count / max) * 84}%` }}
                      >
                        <span>{d.count}</span>
                      </div>
                      <small>{d.label}</small>
                    </div>
                  ))}
                </div>
              </div>
              <div className="chart-footer">
                <Icon name="Activity" size={16} />
                {days.reduce((a, d) => a + d.count, 0)}{' '}
                {t('appointments in this period', 'موعدًا في هذه الفترة')}
                <button className="text-button" onClick={() => navigate('appointments')}>
                  {t('View schedule', 'عرض الجدول')}
                  <Icon name="ChevronRight" size={14} />
                </button>
              </div>
            </section>
          )}
          <section className="card">
            <div className="card-heading">
              <div>
                <h2>
                  {canRead(s.user.role, 'appointments')
                    ? t('Today’s appointments', 'مواعيد اليوم')
                    : t('Your work queue', 'قائمة مهامك')}
                </h2>
                <p>
                  {t('The next steps in every patient journey', 'الخطوات التالية في رحلة كل مريض')}
                </p>
              </div>
              <button
                className="text-button"
                onClick={() =>
                  navigate(
                    canRead(s.user.role, 'appointments')
                      ? 'appointments'
                      : (modules.find((m) => canRead(s.user.role, m.id))?.id ?? 'patients'),
                  )
                }
              >
                {t('View all', 'عرض الكل')}
                <Icon name="ArrowUpRight" size={15} />
              </button>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t('Patient', 'المريض')}</th>
                    <th>{t('Department / service', 'القسم / الخدمة')}</th>
                    <th>{t('Time', 'الوقت')}</th>
                    <th>{t('Status', 'الحالة')}</th>
                    <th>
                      <span className="sr-only">{t('Open', 'فتح')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(canRead(s.user.role, 'appointments') ? appointments : pending)
                    .slice(0, 5)
                    .map((r, i) => (
                      <tr key={r.id}>
                        <td>
                          <button className="cell-button" onClick={() => openRecord(r)}>
                            <PatientName
                              patient={s.patients.find((p) => p.id === r.patientId)}
                              index={i}
                            />
                          </button>
                        </td>
                        <td>
                          <span className="table-primary">
                            {tr(r.data.department ?? (lang === 'ar' ? r.titleAr : r.title), lang)}
                          </span>
                          <small className="cell-sub">
                            {tr(r.data.visitType ?? r.module, lang)}
                          </small>
                        </td>
                        <td className="mono">{r.time}</td>
                        <td>
                          <Badge value={r.status} />
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
                    ))}
                </tbody>
              </table>
            </div>
            {!(canRead(s.user.role, 'appointments') ? appointments : pending).length && (
              <Empty title={t('A clear schedule', 'لا توجد مهام حاليًا')} />
            )}
          </section>
          {reports && (
            <section className="card">
              <div className="card-heading">
                <div>
                  <h2>{t('Department workload', 'عبء العمل حسب القسم')}</h2>
                  <p>
                    {t('Current records grouped by department', 'السجلات الحالية مجمعة حسب القسم')}
                  </p>
                </div>
              </div>
              <div className="report-grid">
                {modules
                  .filter((m) => canRead(s.user.role, m.id))
                  .map((m) => (
                    <button key={m.id} className="report-tile" onClick={() => navigate(m.id)}>
                      <Icon name={m.icon} />
                      <span>{m.name[lang]}</span>
                      <strong>{s.records.filter((r) => r.module === m.id).length}</strong>
                    </button>
                  ))}
              </div>
            </section>
          )}
        </div>
        <aside className="dashboard-aside">
          {canRead(s.user.role, 'admissions') && (
            <section className="card occupancy-card">
              <div className="card-heading">
                <div>
                  <h2>{t('Bed availability', 'توافر الأسرة')}</h2>
                  <p>{t('Across 4 hospital wards', 'عبر 4 أجنحة في المستشفى')}</p>
                </div>
                <Icon name="BedDouble" />
              </div>
              <div
                className="donut"
                style={{
                  background: `conic-gradient(var(--teal) 0 ${(admissions.length / 24) * 100}%, #edf3f1 ${(admissions.length / 24) * 100}% 100%)`,
                }}
              >
                <div>
                  <strong>{24 - admissions.length}</strong>
                  <span>{t('beds available', 'سريرًا متاحًا')}</span>
                </div>
              </div>
              <div className="occupancy-legend">
                <span>
                  <i className="teal-dot" />
                  {t('Occupied', 'مشغول')}
                  <b>{admissions.length}</b>
                </span>
                <span>
                  <i className="gray-dot" />
                  {t('Available', 'متاح')}
                  <b>{24 - admissions.length}</b>
                </span>
              </div>
              <button className="button full" onClick={() => navigate('admissions')}>
                {t('Open bed board', 'عرض لوحة الأسرة')}
                <Icon name="ArrowUpRight" size={16} />
              </button>
            </section>
          )}
          <section className="card">
            <div className="card-heading">
              <div>
                <h2>{t('Needs attention', 'يحتاج إلى متابعة')}</h2>
                <p>{t('Priorities across your workspace', 'الأولويات في مساحة عملك')}</p>
              </div>
              <span className="count-bubble">{urgent.length}</span>
            </div>
            <div className="attention-list">
              {urgent.map((r) => (
                <button key={r.id} onClick={() => openRecord(r)}>
                  <span className={`attention-icon ${r.priority === 'critical' ? 'red' : 'amber'}`}>
                    <Icon name={moduleByIcon(r.module)} size={17} />
                  </span>
                  <div>
                    <strong>{lang === 'ar' ? r.titleAr : r.title}</strong>
                    <small>
                      {tr(r.priority, lang)} · {r.patientId}
                    </small>
                  </div>
                  <Icon name="ChevronRight" size={14} />
                </button>
              ))}
              {!urgent.length && (
                <p className="quiet-message">
                  {t('No urgent items in your queue.', 'لا توجد عناصر عاجلة في قائمتك.')}
                </p>
              )}
            </div>
          </section>
          <section className="quick-card">
            <div className="card-heading">
              <div>
                <h2>{t('Quick actions', 'إجراءات سريعة')}</h2>
                <p>{t('A little less clicking, more caring.', 'نقرات أقل، رعاية أكثر.')}</p>
              </div>
              <Icon name="Sparkles" />
            </div>
            <div className="quick-grid">
              {[
                { id: 'appointments', icon: 'CalendarDays', en: 'Book a visit', ar: 'حجز موعد' },
                { id: 'laboratory', icon: 'FlaskConical', en: 'Order a test', ar: 'طلب تحليل' },
                { id: 'admissions', icon: 'BedDouble', en: 'Admit patient', ar: 'تنويم مريض' },
                { id: 'billing', icon: 'Receipt', en: 'New invoice', ar: 'فاتورة جديدة' },
              ]
                .filter((a) => canWrite(s.user.role, a.id))
                .map((a) => (
                  <button key={a.id} onClick={() => create(a.id)}>
                    <Icon name={a.icon} />
                    <span>{t(a.en, a.ar)}</span>
                  </button>
                ))}
            </div>
          </section>
          <div className="team-strip">
            <div className="avatar-stack">
              {s.users.slice(0, 3).map((u, i) => (
                <Avatar key={u.id} name={lang === 'ar' ? u.nameAr : u.name} index={i} small />
              ))}
            </div>
            <div>
              <strong>
                {s.users.length} {t('team members', 'أعضاء في الفريق')}
              </strong>
              <small>{t('One connected workspace', 'مساحة عمل واحدة متصلة')}</small>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
function moduleByIcon(id: string) {
  return modules.find((m) => m.id === id)?.icon ?? 'Activity';
}
