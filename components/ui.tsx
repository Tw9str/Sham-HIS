'use client';
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  BedDouble,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  FileText,
  FlaskConical,
  Globe2,
  HeartPulse,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Package,
  Pill,
  Plus,
  Receipt,
  RefreshCw,
  ScanLine,
  Scissors,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Siren,
  Sparkles,
  Stethoscope,
  Users,
  UsersRound,
  Wallet,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  tr,
  type Lang,
  type Patient,
  type Snapshot,
  type View,
  type WorkRecord,
} from '@/lib/catalog';
export const icons: Record<string, LucideIcon> = {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  BedDouble,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  FileText,
  FlaskConical,
  Globe2,
  HeartPulse,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Package,
  Pill,
  Plus,
  Receipt,
  RefreshCw,
  ScanLine,
  Scissors,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Siren,
  Sparkles,
  Stethoscope,
  Users,
  UsersRound,
  Wallet,
  Wrench,
  X,
};
export function Icon({
  name,
  size = 18,
  ...props
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Component = icons[name] ?? FileText;
  return <Component size={size} strokeWidth={1.7} aria-hidden="true" {...props} />;
}
type Context = {
  lang: Lang;
  t: (en: string, ar: string) => string;
  snapshot: Snapshot;
  navigate: (view: View) => void;
  openPatient: (p: Patient) => void;
  openRecord: (r: WorkRecord) => void;
  create: (module: string, patientId?: string) => void;
  mutate: (data: unknown) => Promise<boolean>;
  busy: boolean;
  notify: (message: string) => void;
};
export const HospitalContext = createContext<Context | null>(null);
export function useHospital() {
  const c = useContext(HospitalContext);
  if (!c) throw new Error('Missing hospital context');
  return c;
}
export function SkipLink() {
  return (
    <a
      className="skip-link"
      href="#main-content"
      onClick={(event) => {
        event.preventDefault();
        const main = document.getElementById('main-content') ?? document.querySelector('main');
        if (main) {
          main.setAttribute('tabindex', '-1');
          main.focus();
        }
      }}
    >
      Skip to content / انتقل إلى المحتوى
    </a>
  );
}
export function Badge({ value }: { value: string }) {
  const { lang } = useHospital();
  return (
    <span className={`badge status-${value}`}>
      <i />
      {tr(value, lang)}
    </span>
  );
}
export function Avatar({
  name,
  index = 0,
  small = false,
}: {
  name: string;
  index?: number;
  small?: boolean;
}) {
  return (
    <span className={`avatar avatar-${index % 5} ${small ? 'small' : ''}`}>
      {name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')}
    </span>
  );
}
export function PatientName({
  patient,
  sub,
  index = 0,
}: {
  patient?: Patient;
  sub?: string;
  index?: number;
}) {
  const { lang, t } = useHospital();
  return (
    <div className="identity">
      <Avatar
        name={patient ? (lang === 'ar' ? patient.nameAr : patient.name) : '?'}
        index={index}
      />
      <div>
        <strong>
          {patient
            ? lang === 'ar'
              ? patient.nameAr
              : patient.name
            : t('Unlinked record', 'سجل غير مرتبط')}
        </strong>
        <small dir="auto">{sub ?? patient?.id}</small>
      </div>
    </div>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name="ClipboardCheck" size={28} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useHospital();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
    >
      <div className="modal-head">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label={t('Close', 'إغلاق')}
        >
          <Icon name="X" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function downloadCSV(filename: string, rows: string[][]) {
  const text =
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((cell) => {
            let value = String(cell ?? '');
            if (/^[=+@\-\t\r]/.test(value)) value = "'" + value;
            return '"' + value.replace(/"/g, '""') + '"';
          })
          .join(','),
      )
      .join('\r\n');
  const a = document.createElement('a');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8;' }));
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function formatMoney(amount: number, lang: Lang) {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-SY-u-nu-latn' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount);
}
export function localDate(date: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SY-u-nu-latn' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date.length === 10 ? date + 'T12:00:00' : date));
}
