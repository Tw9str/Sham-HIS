export type Lang = 'en' | 'ar';
export type Localized = { en: string; ar: string };
export type Role = 'admin' | 'doctor' | 'nurse' | 'reception' | 'lab' | 'pharmacist' | 'billing';
export type ModuleId =
  | 'appointments'
  | 'encounters'
  | 'emergency'
  | 'admissions'
  | 'nursing'
  | 'laboratory'
  | 'radiology'
  | 'pharmacy'
  | 'surgery'
  | 'billing'
  | 'insurance'
  | 'inventory'
  | 'procurement'
  | 'housekeeping'
  | 'equipment'
  | 'quality'
  | 'staff';
export type View = 'dashboard' | 'patients' | ModuleId | 'reports' | 'audit' | 'settings';
export type Field = {
  key: string;
  label: Localized;
  type?: 'text' | 'number' | 'date' | 'textarea' | 'select';
  required?: boolean;
  options?: string[];
};
export type Module = {
  id: ModuleId;
  name: Localized;
  description: Localized;
  singular: Localized;
  icon: string;
  group: 'care' | 'operations';
  states: string[];
  roles: Role[];
  patient?: boolean;
  fields: Field[];
};
export const l = (en: string, ar: string): Localized => ({ en, ar });
const f = (
  key: string,
  en: string,
  ar: string,
  type: Field['type'] = 'text',
  required = false,
  options?: string[],
): Field => ({ key, label: l(en, ar), type, required, options });
export const modules: Module[] = [
  {
    id: 'appointments',
    name: l('Appointments', 'المواعيد'),
    description: l(
      'A coordinated day, from arrival to consultation.',
      'تنظيم يوم الرعاية من الوصول إلى الاستشارة.',
    ),
    singular: l('appointment', 'موعد'),
    icon: 'CalendarDays',
    group: 'care',
    states: ['scheduled', 'checked-in', 'in-progress', 'completed', 'cancelled'],
    roles: ['reception', 'doctor'],
    patient: true,
    fields: [
      f('department', 'Department', 'القسم', 'select', true, [
        'General medicine',
        'Cardiology',
        'Orthopedics',
        'Pediatrics',
        'Neurology',
        'Obstetrics',
      ]),
      f('visitType', 'Visit type', 'نوع الزيارة', 'select', true, [
        'Consultation',
        'Follow-up',
        'Procedure',
      ]),
    ],
  },
  {
    id: 'encounters',
    name: l('Clinical workspace', 'مساحة الطبيب'),
    description: l(
      'The patient story, with every encounter in context.',
      'قصة المريض وسياق كل زيارة في مكان واحد.',
    ),
    singular: l('encounter', 'زيارة'),
    icon: 'Stethoscope',
    group: 'care',
    states: ['waiting', 'in-progress', 'signed'],
    roles: ['doctor'],
    patient: true,
    fields: [
      f('complaint', 'Chief complaint', 'الشكوى الرئيسية', 'textarea', true),
      f('vitals', 'Vital signs', 'العلامات الحيوية'),
      f('diagnosis', 'Diagnosis / code', 'التشخيص / الرمز'),
      f('assessment', 'Assessment & plan', 'التقييم والخطة', 'textarea'),
    ],
  },
  {
    id: 'emergency',
    name: l('Emergency', 'الطوارئ'),
    description: l(
      'Triage, prioritize, and coordinate urgent care.',
      'الفرز وتحديد الأولوية وتنسيق الرعاية العاجلة.',
    ),
    singular: l('emergency case', 'حالة طوارئ'),
    icon: 'Siren',
    group: 'care',
    states: ['triaged', 'in-treatment', 'transferred', 'discharged'],
    roles: ['doctor', 'nurse'],
    patient: true,
    fields: [
      f('acuity', 'Triage level', 'مستوى الفرز', 'select', true, [
        'Resuscitation',
        'Emergent',
        'Urgent',
        'Less urgent',
        'Non-urgent',
      ]),
      f('complaint', 'Presenting complaint', 'الشكوى الحالية', 'textarea', true),
      f('location', 'Treatment bay', 'غرفة العلاج'),
    ],
  },
  {
    id: 'admissions',
    name: l('Admissions & beds', 'التنويم والأسرة'),
    description: l(
      'One clear view of wards, beds, and patient movement.',
      'رؤية شاملة للأجنحة والأسرة وحركة المرضى.',
    ),
    singular: l('admission', 'دخول'),
    icon: 'BedDouble',
    group: 'care',
    states: ['admitted', 'discharged'],
    roles: ['reception', 'doctor', 'nurse'],
    patient: true,
    fields: [
      f('ward', 'Ward', 'الجناح', 'select', true, [
        'General ward',
        'Cardiology',
        'Surgical ward',
        'Intensive care',
      ]),
      f(
        'bed',
        'Bed',
        'السرير',
        'select',
        true,
        Array.from({ length: 24 }, (_, i) => `B-${String(i + 1).padStart(2, '0')}`),
      ),
      f(
        'reason',
        'Admission reason / discharge summary',
        'سبب الدخول / ملخص الخروج',
        'textarea',
        true,
      ),
    ],
  },
  {
    id: 'nursing',
    name: l('Nursing station', 'محطة التمريض'),
    description: l(
      'Care plans, observations, and bedside tasks.',
      'خطط الرعاية والملاحظات ومهام التمريض.',
    ),
    singular: l('care task', 'مهمة رعاية'),
    icon: 'HeartPulse',
    group: 'care',
    states: ['pending', 'in-progress', 'completed'],
    roles: ['nurse', 'doctor'],
    patient: true,
    fields: [
      f('taskType', 'Care type', 'نوع الرعاية', 'select', true, [
        'Observation',
        'Wound care',
        'Care plan',
        'Handover',
      ]),
      f('instructions', 'Instructions', 'التعليمات', 'textarea', true),
      f('observation', 'Observation / completion note', 'الملاحظة / توثيق الإنجاز', 'textarea'),
    ],
  },
  {
    id: 'laboratory',
    name: l('Laboratory', 'المختبر'),
    description: l(
      'Track specimens and results from order to verification.',
      'متابعة العينات والنتائج من الطلب إلى الاعتماد.',
    ),
    singular: l('lab order', 'طلب تحليل'),
    icon: 'FlaskConical',
    group: 'care',
    states: ['ordered', 'collected', 'resulted', 'verified'],
    roles: ['lab', 'doctor'],
    patient: true,
    fields: [
      f('test', 'Test / panel', 'التحليل', 'select', true, [
        'Complete blood count',
        'Lipid panel',
        'HbA1c',
        'Renal function',
        'Liver function',
        'Urinalysis',
      ]),
      f('specimen', 'Specimen', 'العينة', 'select', true, ['Blood', 'Urine', 'Swab']),
      f('result', 'Result, units & reference range', 'النتيجة والوحدة والمجال المرجعي', 'textarea'),
    ],
  },
  {
    id: 'radiology',
    name: l('Radiology', 'الأشعة'),
    description: l(
      'Imaging requests and reports, connected to the chart.',
      'طلبات التصوير والتقارير مرتبطة بملف المريض.',
    ),
    singular: l('imaging order', 'طلب تصوير'),
    icon: 'ScanLine',
    group: 'care',
    states: ['requested', 'scheduled', 'reported', 'verified'],
    roles: ['doctor'],
    patient: true,
    fields: [
      f('modality', 'Modality', 'نوع التصوير', 'select', true, [
        'X-ray',
        'Ultrasound',
        'CT',
        'MRI',
      ]),
      f('bodyPart', 'Body part / indication', 'المنطقة / الاستطباب', 'text', true),
      f('result', 'Radiology report', 'تقرير الأشعة', 'textarea'),
    ],
  },
  {
    id: 'pharmacy',
    name: l('Pharmacy', 'الصيدلية'),
    description: l(
      'Review prescriptions and record stock-linked dispensing.',
      'مراجعة الوصفات وتوثيق الصرف المرتبط بالمخزون.',
    ),
    singular: l('prescription', 'وصفة'),
    icon: 'Pill',
    group: 'care',
    states: ['prescribed', 'reviewed', 'dispensed'],
    roles: ['doctor', 'pharmacist'],
    patient: true,
    fields: [
      f('medication', 'Medication & strength', 'الدواء والتركيز', 'text', true),
      f('directions', 'Dose, route & frequency', 'الجرعة والطريق والتكرار', 'text', true),
      f('quantity', 'Quantity', 'الكمية', 'number', true),
      f('stockId', 'Stock reference (required to dispense)', 'مرجع المخزون (مطلوب للصرف)'),
      f('notes', 'Pharmacist notes', 'ملاحظات الصيدلي', 'textarea'),
    ],
  },
  {
    id: 'surgery',
    name: l('Operating theatres', 'غرف العمليات'),
    description: l(
      'Coordinate theatre schedules and surgical cases.',
      'تنسيق جداول غرف العمليات والحالات الجراحية.',
    ),
    singular: l('surgical case', 'حالة جراحية'),
    icon: 'Scissors',
    group: 'care',
    states: ['scheduled', 'prepared', 'in-progress', 'completed'],
    roles: ['doctor', 'nurse'],
    patient: true,
    fields: [
      f('procedure', 'Procedure', 'الإجراء', 'text', true),
      f('theatre', 'Theatre', 'غرفة العمليات', 'select', true, [
        'Theatre 01',
        'Theatre 02',
        'Theatre 03',
      ]),
      f('checklist', 'Preparation / checklist notes', 'ملاحظات التحضير وقائمة التحقق', 'textarea'),
      f('result', 'Operative note', 'تقرير العملية', 'textarea'),
    ],
  },
  {
    id: 'billing',
    name: l('Billing & payments', 'الفواتير والمدفوعات'),
    description: l(
      'Manage charges, invoices, and recorded payments.',
      'إدارة الرسوم والفواتير وتسجيل المدفوعات.',
    ),
    singular: l('invoice', 'فاتورة'),
    icon: 'Receipt',
    group: 'operations',
    states: ['draft', 'issued', 'paid', 'void'],
    roles: ['billing', 'reception'],
    patient: true,
    fields: [
      f('service', 'Service / charge description', 'الخدمة / وصف الرسوم', 'text', true),
      f('amount', 'Amount (USD)', 'المبلغ (دولار)', 'number', true),
      f('paymentMethod', 'Payment method', 'طريقة الدفع', 'select', true, [
        'Cash',
        'Card',
        'Bank transfer',
      ]),
      f('notes', 'Billing notes', 'ملاحظات الفاتورة', 'textarea'),
    ],
  },
  {
    id: 'insurance',
    name: l('Insurance & claims', 'التأمين والمطالبات'),
    description: l(
      'Follow authorizations and manually tracked claims.',
      'متابعة الموافقات والمطالبات المسجلة يدويًا.',
    ),
    singular: l('claim', 'مطالبة'),
    icon: 'ShieldCheck',
    group: 'operations',
    states: ['draft', 'submitted', 'approved', 'rejected'],
    roles: ['billing'],
    patient: true,
    fields: [
      f('payer', 'Insurance provider', 'شركة التأمين', 'text', true),
      f('policy', 'Policy number', 'رقم البوليصة', 'text', true),
      f('amount', 'Claim amount (USD)', 'مبلغ المطالبة (دولار)', 'number', true),
      f('notes', 'Authorization / claim notes', 'ملاحظات الموافقة / المطالبة', 'textarea'),
    ],
  },
  {
    id: 'inventory',
    name: l('Inventory', 'المخزون'),
    description: l(
      'Track available supplies, thresholds, and expiry dates.',
      'متابعة المستلزمات وحدود المخزون وتواريخ الصلاحية.',
    ),
    singular: l('stock item', 'صنف'),
    icon: 'Package',
    group: 'operations',
    states: ['active', 'inactive'],
    roles: ['pharmacist'],
    fields: [
      f('quantity', 'Available quantity', 'الكمية المتاحة', 'number', true),
      f('reorder', 'Reorder threshold', 'حد إعادة الطلب', 'number', true),
      f('unit', 'Unit', 'الوحدة', 'select', true, ['Tablet', 'Vial', 'Box', 'Unit']),
      f('expiry', 'Expiry date', 'تاريخ الصلاحية', 'date', true),
      f('batch', 'Batch / lot', 'رقم التشغيلة', 'text', true),
      f('location', 'Storage location', 'موقع التخزين', 'text', true),
    ],
  },
  {
    id: 'procurement',
    name: l('Procurement', 'المشتريات'),
    description: l(
      'Purchase requests, approvals, and receiving records.',
      'طلبات الشراء والموافقات وسجلات الاستلام.',
    ),
    singular: l('purchase request', 'طلب شراء'),
    icon: 'ShoppingCart',
    group: 'operations',
    states: ['requested', 'approved', 'ordered', 'received'],
    roles: ['pharmacist'],
    fields: [
      f('supplier', 'Supplier', 'المورد', 'text', true),
      f('items', 'Items & quantities', 'الأصناف والكميات', 'textarea', true),
      f('amount', 'Estimated total (USD)', 'الإجمالي التقديري (دولار)', 'number', true),
      f('notes', 'Receiving notes', 'ملاحظات الاستلام', 'textarea'),
    ],
  },
  {
    id: 'housekeeping',
    name: l('Housekeeping', 'الخدمات الفندقية'),
    description: l(
      'Room turnover and environmental service requests.',
      'تجهيز الغرف وطلبات الخدمات البيئية.',
    ),
    singular: l('service request', 'طلب خدمة'),
    icon: 'Sparkles',
    group: 'operations',
    states: ['pending', 'in-progress', 'completed'],
    roles: ['nurse'],
    fields: [
      f('location', 'Room / location', 'الغرفة / الموقع', 'text', true),
      f('service', 'Service type', 'نوع الخدمة', 'select', true, [
        'Room turnover',
        'Routine cleaning',
        'Deep cleaning',
      ]),
      f('notes', 'Service notes', 'ملاحظات الخدمة', 'textarea'),
    ],
  },
  {
    id: 'equipment',
    name: l('Biomedical assets', 'الأجهزة الطبية'),
    description: l(
      'Asset servicing, maintenance, and downtime tracking.',
      'صيانة الأجهزة ومتابعة أعمال الخدمة والتوقف.',
    ),
    singular: l('maintenance ticket', 'طلب صيانة'),
    icon: 'Wrench',
    group: 'operations',
    states: ['open', 'in-progress', 'resolved'],
    roles: [],
    fields: [
      f('asset', 'Asset ID', 'رقم الأصل', 'text', true),
      f('location', 'Location', 'الموقع', 'text', true),
      f('issue', 'Issue / maintenance details', 'تفاصيل العطل / الصيانة', 'textarea', true),
      f('result', 'Resolution', 'الإصلاح', 'textarea'),
    ],
  },
  {
    id: 'quality',
    name: l('Quality & safety', 'الجودة والسلامة'),
    description: l(
      'Document incidents and follow corrective actions.',
      'توثيق الحوادث ومتابعة الإجراءات التصحيحية.',
    ),
    singular: l('incident', 'حادثة'),
    icon: 'ClipboardCheck',
    group: 'operations',
    states: ['reported', 'investigating', 'resolved'],
    roles: ['doctor', 'nurse'],
    fields: [
      f('category', 'Category', 'الفئة', 'select', true, [
        'Patient safety',
        'Infection prevention',
        'Process improvement',
        'Facility',
      ]),
      f('description', 'Incident details', 'تفاصيل الحادثة', 'textarea', true),
      f('result', 'Corrective action', 'الإجراء التصحيحي', 'textarea'),
    ],
  },
  {
    id: 'staff',
    name: l('Team & rosters', 'الفريق والمناوبات'),
    description: l(
      'Coordinate department assignments and staff shifts.',
      'تنسيق تكليفات الأقسام ومناوبات الموظفين.',
    ),
    singular: l('roster entry', 'مناوبة'),
    icon: 'UsersRound',
    group: 'operations',
    states: ['scheduled', 'confirmed', 'completed'],
    roles: [],
    fields: [
      f('department', 'Department', 'القسم', 'text', true),
      f('shift', 'Shift', 'المناوبة', 'select', true, ['Morning', 'Evening', 'Night']),
      f('designation', 'Designation', 'المسمى الوظيفي', 'text', true),
      f('contact', 'Contact', 'التواصل'),
    ],
  },
];
export const labels: Record<string, Localized> = {
  dashboard: l('Overview', 'نظرة عامة'),
  patients: l('Patient directory', 'سجل المرضى'),
  reports: l('Reports & insights', 'التقارير والتحليلات'),
  audit: l('Audit trail', 'سجل التدقيق'),
  settings: l('Settings', 'الإعدادات'),
  scheduled: l('Scheduled', 'مجدول'),
  'checked-in': l('Checked in', 'تم الحضور'),
  'in-progress': l('In progress', 'قيد التنفيذ'),
  completed: l('Completed', 'مكتمل'),
  cancelled: l('Cancelled', 'ملغى'),
  waiting: l('Waiting', 'بانتظار الخدمة'),
  signed: l('Signed', 'موقّع'),
  triaged: l('Triaged', 'تم الفرز'),
  'in-treatment': l('In treatment', 'قيد العلاج'),
  transferred: l('Transferred', 'تم التحويل'),
  discharged: l('Discharged', 'تم التخريج'),
  admitted: l('Admitted', 'منوّم'),
  pending: l('Pending', 'معلّق'),
  ordered: l('Ordered', 'تم الطلب'),
  collected: l('Collected', 'تم السحب'),
  resulted: l('Result entered', 'تم إدخال النتيجة'),
  verified: l('Verified', 'معتمد'),
  requested: l('Requested', 'مطلوب'),
  reported: l('Reported', 'تم التوثيق'),
  prescribed: l('Prescribed', 'موصوف'),
  reviewed: l('Reviewed', 'تمت المراجعة'),
  dispensed: l('Dispensed', 'تم الصرف'),
  prepared: l('Prepared', 'جاهز'),
  draft: l('Draft', 'مسودة'),
  issued: l('Issued', 'صادرة'),
  paid: l('Paid', 'مدفوعة'),
  void: l('Void', 'ملغاة'),
  submitted: l('Submitted', 'مقدمة'),
  approved: l('Approved', 'معتمد'),
  rejected: l('Rejected', 'مرفوض'),
  active: l('Active', 'نشط'),
  inactive: l('Inactive', 'غير نشط'),
  received: l('Received', 'مستلم'),
  open: l('Open', 'مفتوح'),
  resolved: l('Resolved', 'تم الحل'),
  investigating: l('Investigating', 'قيد التحقيق'),
  confirmed: l('Confirmed', 'مؤكد'),
  routine: l('Routine', 'اعتيادي'),
  urgent: l('Urgent', 'عاجل'),
  critical: l('Critical', 'حرج'),
  admin: l('Administrator', 'مدير النظام'),
  doctor: l('Physician', 'طبيب'),
  nurse: l('Nurse', 'ممرض'),
  reception: l('Receptionist', 'موظف استقبال'),
  lab: l('Lab specialist', 'اختصاصي مختبر'),
  pharmacist: l('Pharmacist', 'صيدلي'),
  billing: l('Billing officer', 'موظف الفوترة'),
  'General medicine': l('General medicine', 'الطب العام'),
  Cardiology: l('Cardiology', 'القلبية'),
  Orthopedics: l('Orthopedics', 'العظمية'),
  Pediatrics: l('Pediatrics', 'الأطفال'),
  Neurology: l('Neurology', 'العصبية'),
  Obstetrics: l('Obstetrics', 'التوليد'),
  Consultation: l('Consultation', 'استشارة'),
  'Follow-up': l('Follow-up', 'متابعة'),
  Procedure: l('Procedure', 'إجراء'),
  'General ward': l('General ward', 'الجناح العام'),
  'Surgical ward': l('Surgical ward', 'جناح الجراحة'),
  'Intensive care': l('Intensive care', 'العناية المركزة'),
  Morning: l('Morning', 'صباحية'),
  Evening: l('Evening', 'مسائية'),
  Night: l('Night', 'ليلية'),
  Cash: l('Cash', 'نقدًا'),
  Card: l('Card', 'بطاقة'),
  'Bank transfer': l('Bank transfer', 'تحويل مصرفي'),
  Blood: l('Blood', 'دم'),
  Urine: l('Urine', 'بول'),
  Swab: l('Swab', 'مسحة'),
  'Complete blood count': l('Complete blood count', 'تعداد الدم الكامل'),
  'Lipid panel': l('Lipid panel', 'شحوم الدم'),
  HbA1c: l('HbA1c', 'الخضاب السكري'),
  'Renal function': l('Renal function', 'وظائف الكلى'),
  'Liver function': l('Liver function', 'وظائف الكبد'),
  Urinalysis: l('Urinalysis', 'تحليل البول'),
  'X-ray': l('X-ray', 'أشعة سينية'),
  Ultrasound: l('Ultrasound', 'أمواج فوق صوتية'),
  CT: l('CT', 'تصوير طبقي'),
  MRI: l('MRI', 'رنين مغناطيسي'),
  Resuscitation: l('Resuscitation', 'إنعاش'),
  Emergent: l('Emergent', 'طارئ جدًا'),
  Urgent: l('Urgent', 'عاجل'),
  'Less urgent': l('Less urgent', 'أقل إلحاحًا'),
  'Non-urgent': l('Non-urgent', 'غير عاجل'),
  Observation: l('Observation', 'مراقبة'),
  'Wound care': l('Wound care', 'العناية بالجروح'),
  'Care plan': l('Care plan', 'خطة رعاية'),
  Handover: l('Handover', 'تسليم المناوبة'),
  'Theatre 01': l('Theatre 01', 'غرفة العمليات 01'),
  'Theatre 02': l('Theatre 02', 'غرفة العمليات 02'),
  'Theatre 03': l('Theatre 03', 'غرفة العمليات 03'),
  Tablet: l('Tablet', 'قرص'),
  Vial: l('Vial', 'قارورة'),
  Box: l('Box', 'علبة'),
  Unit: l('Unit', 'وحدة'),
  'Room turnover': l('Room turnover', 'تجهيز الغرفة'),
  'Routine cleaning': l('Routine cleaning', 'تنظيف دوري'),
  'Deep cleaning': l('Deep cleaning', 'تنظيف عميق'),
  'Patient safety': l('Patient safety', 'سلامة المرضى'),
  'Infection prevention': l('Infection prevention', 'مكافحة العدوى'),
  'Process improvement': l('Process improvement', 'تحسين الإجراءات'),
  Facility: l('Facility', 'المرافق'),
};
export function tr(value: string, lang: Lang) {
  return labels[value]?.[lang] ?? value;
}
export function moduleById(id: string) {
  return modules.find((m) => m.id === id);
}
export function canWrite(role: Role, id: string) {
  return role === 'admin' || !!moduleById(id)?.roles.includes(role);
}
export function canRead(role: Role, id: string) {
  if (role === 'admin') return true;
  if (['dashboard', 'patients', 'settings'].includes(id)) return true;
  const visibility: Record<Role, string[]> = {
    admin: [],
    doctor: [
      'appointments',
      'encounters',
      'emergency',
      'admissions',
      'nursing',
      'laboratory',
      'radiology',
      'pharmacy',
      'surgery',
      'quality',
    ],
    nurse: [
      'appointments',
      'emergency',
      'admissions',
      'nursing',
      'laboratory',
      'radiology',
      'pharmacy',
      'surgery',
      'housekeeping',
      'quality',
    ],
    reception: ['appointments', 'admissions', 'billing'],
    lab: ['laboratory'],
    pharmacist: ['pharmacy', 'inventory', 'procurement'],
    billing: ['billing', 'insurance', 'reports'],
  };
  return visibility[role].includes(id);
}
export type Patient = {
  id: string;
  name: string;
  nameAr: string;
  dob: string;
  sex: string;
  phone: string;
  blood: string;
  allergies: string;
  address: string;
  createdAt: string;
};
export type WorkRecord = {
  id: string;
  module: ModuleId;
  title: string;
  titleAr: string;
  patientId: string;
  assignedTo: string;
  priority: string;
  status: string;
  date: string;
  time: string;
  data: Record<string, string>;
  version: number;
  createdAt: string;
};
export type User = { id: string; name: string; nameAr: string; role: Role; email: string };
export type Audit = {
  id: string;
  actor: string;
  action: string;
  entity: string;
  detail: string;
  at: string;
};
export type Snapshot = {
  user: User;
  patients: Patient[];
  records: WorkRecord[];
  users: User[];
  audit: Audit[];
  settings: Record<string, string>;
  demo: boolean;
};
