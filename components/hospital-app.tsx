'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { canRead, modules, tr, type Lang, type Snapshot, type View } from '@/lib/catalog';
import { Avatar, HospitalContext, Icon } from './ui';
import { Dashboard } from './dashboard';
import { AuditView, ModuleView, Patients, SettingsView } from './views';
import { WorkspaceDialog, type DialogState } from './dialogs';
import { useBrowserPreferences } from './browser-preferences';

export function HospitalApp() {
  const { lang, setLang, view } = useBrowserPreferences();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoLoginAvailable, setDemoLoginAvailable] = useState(false);
  const [demo, setDemo] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState('');
  const [notifications, setNotifications] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const t = (en: string, ar: string) => (lang === 'ar' ? ar : en);
  const refresh = useCallback(async () => {
    const response = await fetch('/api/hospital', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setDemo(!!data.demo);
    setDemoLoginAvailable(!!data.demoLoginAvailable);
    setSnapshot(data.user ? data : null);
    setLoading(false);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/hospital', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setDemo(!!data.demo);
        setDemoLoginAvailable(!!data.demoLoginAvailable);
        setSnapshot(data.user ? data : null);
        setLoading(false);
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setToast({ message: e.message, error: true });
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSearch('');
        setNotifications(false);
        setMobile(false);
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(timer);
  }, [toast]);
  const navigate = (target: View) => {
    window.location.hash = target;
    setMobile(false);
    setSearch('');
    setNotifications(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const mutate = async (data: unknown) => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    try {
      const response = await fetch('/api/hospital', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          setSnapshot(null);
          setDialog(null);
        }
        throw new Error(result.error);
      }
      await refresh();
      if (!['login', 'logout'].includes((data as { action: string }).action))
        setToast({
          message: t('Changes saved successfully.', 'تم حفظ التغييرات بنجاح.'),
          error: false,
        });
      return true;
    } catch (error) {
      setToast({ message: (error as Error).message, error: true });
      return false;
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  const toastElement = toast && (
    <div className={`toast ${toast.error ? 'error' : ''}`} role={toast.error ? 'alert' : 'status'}>
      <Icon name={toast.error ? 'Siren' : 'CheckCheck'} />
      <span>{toast.message}</span>
      <button
        className="icon-button"
        onClick={() => setToast(null)}
        aria-label={t('Dismiss', 'إغلاق')}
      >
        <Icon name="X" size={16} />
      </button>
    </div>
  );
  if (loading)
    return (
      <main className="loading-screen">
        <span className="brand-symbol">✚</span>
        <h1>{t('Sham Clinic', 'عيادة شام')}</h1>
        <p>{t('Preparing your workspace…', 'جارٍ تحضير مساحة عملك…')}</p>
        <span className="loading-line" />
      </main>
    );
  if (!snapshot)
    return (
      <>
        <Login
          lang={lang}
          setLang={setLang}
          demo={demoLoginAvailable}
          onLogin={mutate}
          busy={busy}
        />
        {toastElement}
      </>
    );
  const visibleView = canRead(snapshot.user.role, view) ? view : 'dashboard';
  const label = modules.find((m) => m.id === visibleView)?.name[lang] ?? tr(visibleView, lang);
  const query = search.trim().toLowerCase();
  const matchedPatients = query
    ? snapshot.patients
        .filter((p) => `${p.name} ${p.nameAr} ${p.id} ${p.phone}`.toLowerCase().includes(query))
        .slice(0, 4)
    : [];
  const matchedRecords = query
    ? snapshot.records
        .filter((r) => `${r.title} ${r.titleAr} ${r.id}`.toLowerCase().includes(query))
        .slice(0, 4)
    : [];
  const priorities = snapshot.records.filter(
    (r) =>
      r.priority !== 'routine' &&
      ![
        'completed',
        'verified',
        'signed',
        'paid',
        'discharged',
        'dispensed',
        'cancelled',
        'void',
        'resolved',
      ].includes(r.status),
  );
  const create = (module: string, patientId?: string) =>
    setDialog({ kind: 'create', module, patientId });
  return (
    <HospitalContext.Provider
      value={{
        lang,
        t,
        snapshot,
        navigate,
        openPatient: (p) => setDialog({ kind: 'patient', id: p.id }),
        openRecord: (r) => setDialog({ kind: 'record', id: r.id }),
        create,
        mutate,
        busy,
        notify: (message) => setToast({ message, error: false }),
      }}
    >
      <div className="app-shell">
        {mobile && (
          <button
            className="sidebar-backdrop"
            onClick={() => setMobile(false)}
            aria-label={t('Close navigation', 'إغلاق التنقل')}
          />
        )}
        <aside
          className={`sidebar ${mobile ? 'mobile-open' : ''}`}
          aria-label={t('Main navigation', 'التنقل الرئيسي')}
        >
          <a className="brand" href="#dashboard" onClick={() => navigate('dashboard')}>
            <span className="brand-symbol">✚</span>
            <span>
              <strong>{lang === 'ar' ? snapshot.settings.nameAr : snapshot.settings.name}</strong>
              <small>{t('HOSPITAL WORKSPACE', 'مساحة عمل المستشفى')}</small>
            </span>
          </a>
          <div className="hospital-switch">
            <span className="hospital-building">
              <Icon name="HeartPulse" />
            </span>
            <div>
              <strong>{t('Main hospital', 'المستشفى الرئيسي')}</strong>
              <small>
                <i />
                {t('Hospital workspace', 'مساحة عمل المستشفى')}
              </small>
            </div>
            <Icon name="ChevronDown" size={14} />
          </div>
          <nav className="main-nav">
            <div className="nav-group-label">{t('WORKSPACE', 'مساحة العمل')}</div>
            {[
              { id: 'dashboard', icon: 'LayoutDashboard', label: t('Overview', 'نظرة عامة') },
              { id: 'patients', icon: 'Users', label: t('Patients', 'المرضى') },
            ].map((item) => (
              <button
                key={item.id}
                aria-current={visibleView === item.id ? 'page' : undefined}
                className={`nav-item ${visibleView === item.id ? 'active' : ''}`}
                onClick={() => navigate(item.id as View)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.id === 'dashboard' && <i className="nav-active-dot" />}
              </button>
            ))}
            {(['care', 'operations'] as const).map((group) => (
              <div key={group}>
                <div className="nav-group-label">
                  {group === 'care'
                    ? t('PATIENT CARE', 'رعاية المرضى')
                    : t('OPERATIONS', 'العمليات')}
                </div>
                {modules
                  .filter((m) => m.group === group && canRead(snapshot.user.role, m.id))
                  .map((m) => (
                    <button
                      key={m.id}
                      aria-current={visibleView === m.id ? 'page' : undefined}
                      className={`nav-item ${visibleView === m.id ? 'active' : ''}`}
                      onClick={() => navigate(m.id)}
                    >
                      <Icon name={m.icon} />
                      <span>{m.name[lang]}</span>
                      {m.id === 'emergency' && (
                        <span className="nav-count">
                          {
                            snapshot.records.filter(
                              (r) =>
                                r.module === 'emergency' &&
                                !['discharged', 'transferred'].includes(r.status),
                            ).length
                          }
                        </span>
                      )}
                    </button>
                  ))}
              </div>
            ))}
            {['reports', 'audit']
              .filter((id) => canRead(snapshot.user.role, id))
              .map((id) => (
                <button
                  key={id}
                  aria-current={visibleView === id ? 'page' : undefined}
                  className={`nav-item ${visibleView === id ? 'active' : ''}`}
                  onClick={() => navigate(id as View)}
                >
                  <Icon name={id === 'reports' ? 'Activity' : 'ShieldCheck'} />
                  <span>{tr(id, lang)}</span>
                </button>
              ))}
          </nav>
          <div className="sidebar-bottom">
            <button
              className={`nav-item ${visibleView === 'settings' ? 'active' : ''}`}
              onClick={() => navigate('settings')}
            >
              <Icon name="Settings2" />
              <span>{t('Settings', 'الإعدادات')}</span>
            </button>
            <div className="workspace-label">
              <i />
              {demo
                ? t('DEMO WORKSPACE', 'مساحة تجريبية')
                : t('HOSPITAL WORKSPACE', 'مساحة المستشفى')}
              <span>v0.1</span>
            </div>
            <button className="sidebar-profile" onClick={() => navigate('settings')}>
              <Avatar name={lang === 'ar' ? snapshot.user.nameAr : snapshot.user.name} small />
              <span>
                <strong>{lang === 'ar' ? snapshot.user.nameAr : snapshot.user.name}</strong>
                <small>{tr(snapshot.user.role, lang)}</small>
              </span>
              <Icon name="ChevronRight" size={15} />
            </button>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobile(true)}
              aria-label={t('Open navigation', 'فتح التنقل')}
            >
              <Icon name="Menu" />
            </button>
            <div className="breadcrumb">
              <span>{t('Workspace', 'مساحة العمل')}</span>
              <span>/</span>
              <strong>{label}</strong>
            </div>
            <div className="global-search">
              <Icon name="Search" size={17} />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('Search anything…', 'ابحث عن أي شيء…')}
                aria-label={t('Search all patients and records', 'البحث في جميع المرضى والسجلات')}
              />
              <kbd>/</kbd>
              {query && (
                <div className="search-results">
                  <small>{t('PATIENTS & RECORDS', 'المرضى والسجلات')}</small>
                  {matchedPatients.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setDialog({ kind: 'patient', id: p.id });
                        setSearch('');
                      }}
                    >
                      <Icon name="Users" />
                      <span>
                        <strong>{lang === 'ar' ? p.nameAr : p.name}</strong>
                        <small>{p.id}</small>
                      </span>
                    </button>
                  ))}
                  {matchedRecords.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setDialog({ kind: 'record', id: r.id });
                        setSearch('');
                      }}
                    >
                      <Icon name="FileText" />
                      <span>
                        <strong>{lang === 'ar' ? r.titleAr : r.title}</strong>
                        <small>{r.id}</small>
                      </span>
                    </button>
                  ))}
                  {!matchedPatients.length && !matchedRecords.length && (
                    <p>{t('No matching records', 'لا توجد سجلات مطابقة')}</p>
                  )}
                </div>
              )}
            </div>
            <div className="topbar-actions">
              <button
                className="language-button"
                onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
                aria-label={t('Switch to Arabic', 'التبديل إلى الإنجليزية')}
              >
                <Icon name="Globe2" size={17} />
                <span>{lang === 'en' ? 'العربية' : 'English'}</span>
              </button>
              <div className="notification-wrap">
                <button
                  className="icon-button notification-button"
                  aria-label={t('Notifications', 'الإشعارات')}
                  aria-expanded={notifications}
                  onClick={() => setNotifications(!notifications)}
                >
                  <Icon name="Bell" />
                  {priorities.length > 0 && <i />}
                </button>
                {notifications && (
                  <div className="notification-panel">
                    <h3>{t('Priority work queue', 'قائمة العمل ذات الأولوية')}</h3>
                    {priorities.slice(0, 6).map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setDialog({ kind: 'record', id: r.id });
                          setNotifications(false);
                        }}
                      >
                        <span className="tiny-dot" />
                        <span>
                          <strong>{lang === 'ar' ? r.titleAr : r.title}</strong>
                          <small>
                            {tr(r.status, lang)} · {r.id}
                          </small>
                        </span>
                      </button>
                    ))}
                    {!priorities.length && (
                      <p>{t('You’re all caught up.', 'لا توجد عناصر معلقة.')}</p>
                    )}
                  </div>
                )}
              </div>
              <span className="topbar-divider" />
              <button
                className="icon-button"
                onClick={() => mutate({ action: 'logout' })}
                aria-label={t('Sign out', 'تسجيل الخروج')}
                title={t('Sign out', 'تسجيل الخروج')}
              >
                <Icon name="LogOut" size={18} />
              </button>
              <Avatar name={lang === 'ar' ? snapshot.user.nameAr : snapshot.user.name} small />
            </div>
          </header>
          <main className="main-content" id="main-content">
            {visibleView === 'dashboard' ? (
              <Dashboard />
            ) : visibleView === 'reports' ? (
              <Dashboard reports />
            ) : visibleView === 'patients' ? (
              <Patients />
            ) : visibleView === 'audit' ? (
              <AuditView />
            ) : visibleView === 'settings' ? (
              <SettingsView />
            ) : (
              <ModuleView key={visibleView} id={visibleView} />
            )}
            <footer className="page-footer">
              <span>
                © {new Date().getFullYear()}{' '}
                {lang === 'ar' ? snapshot.settings.nameAr : snapshot.settings.name}
              </span>
              <span>
                <Icon name="ShieldCheck" size={13} />
                {demo
                  ? t('Fictional data · local evaluation', 'بيانات وهمية · تقييم محلي')
                  : t('Local workspace', 'مساحة عمل محلية')}
              </span>
              <button onClick={() => navigate('settings')}>
                {t('Workspace settings', 'إعدادات مساحة العمل')}
                <Icon name="ArrowUpRight" size={12} />
              </button>
            </footer>
          </main>
        </div>
      </div>
      {dialog && (
        <WorkspaceDialog
          key={`${dialog.kind}-${'id' in dialog ? dialog.id : dialog.module}`}
          dialog={dialog}
          close={() => setDialog(null)}
          editPatient={(id) => setDialog({ kind: 'edit-patient', id })}
        />
      )}{' '}
      {toastElement}
    </HospitalContext.Provider>
  );
}
function Login({
  lang,
  setLang,
  demo,
  onLogin,
  busy,
}: {
  lang: Lang;
  setLang: (lang: Lang) => void;
  demo: boolean;
  onLogin: (input: unknown) => Promise<boolean>;
  busy: boolean;
}) {
  const t = (en: string, ar: string) => (lang === 'ar' ? ar : en);
  const [email, setEmail] = useState(demo ? 'admin@sham.clinic' : '');
  const [password, setPassword] = useState(demo ? 'ShamDemo2026!' : '');
  return (
    <main className="login-page">
      <section className="login-story">
        <div className="brand">
          <span className="brand-symbol">✚</span>
          <span>
            <strong>{t('Sham Clinic', 'عيادة شام')}</strong>
            <small>{t('HOSPITAL WORKSPACE', 'مساحة عمل المستشفى')}</small>
          </span>
        </div>
        <div className="login-message">
          <span className="live-pill">
            <i />
            {t('CONNECTED CARE, THOUGHTFULLY DESIGNED', 'رعاية متصلة، بتصميم مدروس')}
          </span>
          <h1>
            {t('More connected.', 'تواصل أفضل.')}
            <br />
            {t('More human.', 'رعاية أقرب.')}
          </h1>
          <p>
            {t(
              'One workspace for the people who make better care possible.',
              'مساحة عمل واحدة للأشخاص الذين يجعلون الرعاية الأفضل ممكنة.',
            )}
          </p>
          <div className="login-illustration" aria-hidden="true">
            <div className="login-grid" />
            <span className="illustration-orbit" />
            <div className="illustration-cross">✚</div>
            <div className="illustration-card one">
              <Icon name="HeartPulse" />
              <div>
                <b>{t('Patient-centered', 'المريض أولًا')}</b>
                <small>{t('Every step of the journey', 'في كل خطوة من الرحلة')}</small>
              </div>
              <Icon name="CheckCheck" />
            </div>
            <div className="illustration-card two">
              <span className="mini-avatar">SA</span>
              <span className="mini-avatar">OK</span>
              <span className="mini-avatar">LS</span>
              <span>{t('Better together', 'أفضل معًا')}</span>
            </div>
          </div>
        </div>
        <div className="login-story-footer">
          <span>{t('Designed for a better day of care.', 'صُمم ليوم أفضل من الرعاية.')}</span>
          <span>01 / HIS</span>
        </div>
      </section>
      <section className="login-form-side">
        <button
          className="language-button login-language"
          onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
        >
          <Icon name="Globe2" />
          {lang === 'en' ? 'العربية' : 'English'}
        </button>
        <div className="login-form-box">
          <span className="login-icon">
            <Icon name="Stethoscope" size={28} />
          </span>
          <div className="eyebrow">{t('WELCOME TO YOUR WORKSPACE', 'مرحبًا بك في مساحة عملك')}</div>
          <h2>{t('Good care starts here.', 'الرعاية الجيدة تبدأ هنا.')}</h2>
          <p>{t('Sign in to your hospital workspace.', 'سجّل الدخول إلى مساحة عمل المستشفى.')}</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await onLogin({ action: 'login', email, password });
            }}
          >
            <label className="field">
              {t('Email address', 'البريد الإلكتروني')}
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@sham.clinic"
                dir="ltr"
              />
            </label>
            <label className="field">
              {t('Password', 'كلمة المرور')}
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
              />
            </label>
            <button className="button primary full login-submit" disabled={busy}>
              {busy
                ? t('Signing in…', 'جارٍ تسجيل الدخول…')
                : t('Sign in to workspace', 'الدخول إلى مساحة العمل')}
              <Icon name="ArrowUpRight" />
            </button>
          </form>
          {demo && (
            <div className="demo-login">
              <div>
                <Icon name="Sparkles" size={16} />
                <strong>{t('Explore the demo', 'استكشف النسخة التجريبية')}</strong>
                <span>{t('Fictional data', 'بيانات وهمية')}</span>
              </div>
              <p>
                {t(
                  'Try a different role. All demo accounts use',
                  'جرّب دورًا مختلفًا. كلمة مرور جميع الحسابات التجريبية',
                )}{' '}
                <code>ShamDemo2026!</code>
              </p>
              <div className="demo-role-grid">
                {[
                  { role: 'admin', email: 'admin' },
                  { role: 'doctor', email: 'doctor' },
                  { role: 'nurse', email: 'nurse' },
                  { role: 'reception', email: 'reception' },
                  { role: 'lab', email: 'lab' },
                  { role: 'pharmacist', email: 'pharmacy' },
                  { role: 'billing', email: 'billing' },
                ].map((r) => (
                  <button
                    key={r.role}
                    className={email === r.email + '@sham.clinic' ? 'active' : ''}
                    onClick={() => {
                      setEmail(r.email + '@sham.clinic');
                      setPassword('ShamDemo2026!');
                    }}
                  >
                    {tr(r.role, lang)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="login-security">
            <Icon name="ShieldCheck" size={15} />
            {t('Role-based access · Audited workflows', 'وصول حسب الدور · إجراءات موثقة')}
          </div>
        </div>
        <small className="login-copyright">
          © {new Date().getFullYear()}{' '}
          {t('Sham Clinic. Built around people.', 'عيادة شام. رعاية تتمحور حول الإنسان.')}
        </small>
      </section>
    </main>
  );
}
