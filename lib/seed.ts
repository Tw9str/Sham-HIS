import { modules, type Patient, type WorkRecord, type User } from './catalog';
export const demoUsers: User[] = [
  {
    id: 'USR-01',
    name: 'Ammar Al-Ibrahim',
    nameAr: 'عمار الإبراهيم',
    role: 'admin',
    email: 'admin@sham.clinic',
  },
  {
    id: 'USR-02',
    name: 'Omar Khaled',
    nameAr: 'عمر خالد',
    role: 'doctor',
    email: 'doctor@sham.clinic',
  },
  {
    id: 'USR-03',
    name: 'Lina Saleh',
    nameAr: 'لينا صالح',
    role: 'nurse',
    email: 'nurse@sham.clinic',
  },
  {
    id: 'USR-04',
    name: 'Rami Nasser',
    nameAr: 'رامي ناصر',
    role: 'reception',
    email: 'reception@sham.clinic',
  },
  { id: 'USR-05', name: 'Nour Ali', nameAr: 'نور علي', role: 'lab', email: 'lab@sham.clinic' },
  {
    id: 'USR-06',
    name: 'Hala Youssef',
    nameAr: 'هالة يوسف',
    role: 'pharmacist',
    email: 'pharmacy@sham.clinic',
  },
  {
    id: 'USR-07',
    name: 'Tarek Hasan',
    nameAr: 'طارق حسن',
    role: 'billing',
    email: 'billing@sham.clinic',
  },
];
export function seedData() {
  const today = new Date().toISOString().slice(0, 10),
    createdAt = new Date().toISOString();
  const people = [
    ['Layla Hassan', 'ليلى حسن', '1984-03-18', 'female', 'O+', 'Penicillin / البنسلين'],
    ['Ahmad Saleh', 'أحمد صالح', '1968-06-22', 'male', 'A+', ''],
    ['Nour Almasri', 'نور المصري', '1997-09-12', 'female', 'B+', ''],
    ['Youssef Khalil', 'يوسف خليل', '1976-02-07', 'male', 'O-', 'Latex / اللاتكس'],
    ['Mariam Adel', 'مريم عادل', '2016-05-11', 'female', 'A+', ''],
    ['Khaled Omar', 'خالد عمر', '1959-11-23', 'male', 'AB+', ''],
    ['Rana Hamdan', 'رنا حمدان', '1991-08-04', 'female', 'B-', ''],
    ['Sami Ibrahim', 'سامي إبراهيم', '1988-12-20', 'male', 'O+', ''],
    ['Dima Nasser', 'ديما ناصر', '1980-04-09', 'female', 'A-', ''],
    ['Fadi Mansour', 'فادي منصور', '1972-10-16', 'male', 'B+', ''],
  ];
  const patients: Patient[] = people.map((p, i) => ({
    id: `SC-${String(1024 + i).padStart(5, '0')}`,
    name: p[0],
    nameAr: p[1],
    dob: p[2],
    sex: p[3],
    phone: `+963 9${String(41000000 + i * 1122)}`,
    blood: p[4],
    allergies: p[5],
    address: 'Damascus / دمشق',
    createdAt,
  }));
  const records: WorkRecord[] = [];
  const add = (
    module: WorkRecord['module'],
    title: string,
    titleAr: string,
    patient: number,
    status: string,
    data: Record<string, string>,
    priority = 'routine',
    time = '09:00',
  ) => {
    const id = `${module.slice(0, 3).toUpperCase()}-${String(records.filter((r) => r.module === module).length + 1).padStart(4, '0')}`;
    const role = modules.find((m) => m.id === module)?.roles[0];
    records.push({
      id,
      module,
      title,
      titleAr,
      patientId: patient >= 0 ? patients[patient].id : '',
      assignedTo: demoUsers.find((u) => u.role === role)?.id ?? 'USR-01',
      priority,
      status,
      date: today,
      time,
      data,
      version: 1,
      createdAt,
    });
    return id;
  };
  const visits = [
    ['Cardiology follow-up', 'متابعة قلبية', 'Cardiology', 'checked-in'],
    ['General consultation', 'استشارة طب عام', 'General medicine', 'in-progress'],
    ['Neurology consultation', 'استشارة عصبية', 'Neurology', 'scheduled'],
    ['Orthopedic follow-up', 'متابعة عظمية', 'Orthopedics', 'scheduled'],
    ['Pediatric check-up', 'فحص أطفال', 'Pediatrics', 'completed'],
    ['Cardiology consultation', 'استشارة قلبية', 'Cardiology', 'scheduled'],
  ];
  visits.forEach((v, i) =>
    add(
      'appointments',
      v[0],
      v[1],
      i,
      v[3],
      { department: v[2], visitType: i % 2 ? 'Consultation' : 'Follow-up' },
      i === 1 ? 'urgent' : 'routine',
      `${String(9 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`,
    ),
  );
  [5, 8, 6, 9, 7, 4].forEach((count, day) => {
    for (let i = 0; i < count; i++) {
      add(
        'appointments',
        'Completed consultation',
        'استشارة مكتملة',
        i % patients.length,
        'completed',
        { department: 'General medicine', visitType: 'Consultation' },
        'routine',
        `${String(8 + i).padStart(2, '0')}:00`,
      );
      const d = new Date();
      d.setDate(d.getDate() - (6 - day));
      records[records.length - 1].date = d.toISOString().slice(0, 10);
    }
  });
  add('encounters', 'Blood pressure follow-up', 'متابعة ضغط الدم', 0, 'in-progress', {
    complaint: 'Routine blood pressure follow-up / متابعة دورية لضغط الدم',
    vitals: 'BP 118/76 mmHg · HR 72 bpm · SpO₂ 98% · 36.8°C',
    diagnosis: 'Essential hypertension / ارتفاع ضغط الدم',
    assessment:
      'Review current medications and home readings. / مراجعة الأدوية والقياسات المنزلية.',
  });
  add('encounters', 'General consultation', 'استشارة عامة', 1, 'waiting', {
    complaint: 'Fatigue for 3 days / تعب منذ ثلاثة أيام',
    vitals: '',
    diagnosis: '',
    assessment: '',
  });
  add('encounters', 'Pediatric check-up', 'فحص أطفال', 4, 'signed', {
    complaint: 'Routine check-up / فحص دوري',
    vitals: 'HR 82 bpm · 36.7°C',
    diagnosis: 'Routine examination / فحص روتيني',
    assessment: 'Follow-up as scheduled. / المتابعة حسب الموعد.',
  });
  add(
    'emergency',
    'Acute abdominal pain',
    'ألم بطني حاد',
    7,
    'triaged',
    { acuity: 'Urgent', complaint: 'Abdominal pain / ألم بطني', location: 'ER-02' },
    'urgent',
  );
  add(
    'emergency',
    'Chest pain assessment',
    'تقييم ألم صدري',
    5,
    'in-treatment',
    { acuity: 'Emergent', complaint: 'Chest pain / ألم صدري', location: 'ER-01' },
    'critical',
  );
  [1, 3, 5, 8, 9].forEach((p, i) =>
    add('admissions', 'Inpatient admission', 'دخول المستشفى', p, 'admitted', {
      ward: ['General ward', 'Surgical ward', 'Cardiology', 'General ward', 'Intensive care'][i],
      bed: `B-${String(i * 3 + 1).padStart(2, '0')}`,
      reason: 'Observation and inpatient care / المراقبة والرعاية الداخلية',
    }),
  );
  add(
    'nursing',
    'Record morning observations',
    'تسجيل المراقبة الصباحية',
    1,
    'pending',
    {
      taskType: 'Observation',
      instructions: 'Record observations per care plan / توثيق الملاحظات حسب خطة الرعاية',
      observation: '',
    },
    'urgent',
  );
  add('nursing', 'Wound dressing review', 'مراجعة ضماد الجرح', 3, 'in-progress', {
    taskType: 'Wound care',
    instructions: 'Review wound and document findings / مراجعة الجرح وتوثيق الموجودات',
    observation: '',
  });
  add(
    'laboratory',
    'Complete blood count',
    'تعداد الدم الكامل',
    1,
    'collected',
    { test: 'Complete blood count', specimen: 'Blood', result: '' },
    'urgent',
  );
  add('laboratory', 'Lipid panel', 'شحوم الدم', 0, 'ordered', {
    test: 'Lipid panel',
    specimen: 'Blood',
    result: '',
  });
  add('laboratory', 'HbA1c', 'الخضاب السكري', 5, 'verified', {
    test: 'HbA1c',
    specimen: 'Blood',
    result: '5.4% · Reference / المجال المرجعي: 4.0–5.6%',
  });
  add(
    'radiology',
    'Chest X-ray',
    'صورة صدر',
    5,
    'requested',
    { modality: 'X-ray', bodyPart: 'Chest / صدر', result: '' },
    'urgent',
  );
  add('radiology', 'Abdominal ultrasound', 'إيكو بطن', 7, 'scheduled', {
    modality: 'Ultrasound',
    bodyPart: 'Abdomen / بطن',
    result: '',
  });
  const stock1 = add('inventory', 'Amlodipine 5 mg', 'أملوديبين 5 ملغ', -1, 'active', {
    quantity: '240',
    reorder: '50',
    unit: 'Tablet',
    expiry: '2028-12-31',
    batch: 'AML-2609',
    location: 'Pharmacy A / الصيدلية أ',
  });
  add('inventory', 'Examination gloves', 'قفازات فحص', -1, 'active', {
    quantity: '18',
    reorder: '30',
    unit: 'Box',
    expiry: '2028-06-30',
    batch: 'GL-2606',
    location: 'Central store / المستودع المركزي',
  });
  add('inventory', 'Normal saline 500 ml', 'محلول ملحي 500 مل', -1, 'active', {
    quantity: '86',
    reorder: '25',
    unit: 'Unit',
    expiry: '2028-03-31',
    batch: 'NS-2603',
    location: 'Central store / المستودع المركزي',
  });
  add('pharmacy', 'Amlodipine 5 mg', 'أملوديبين 5 ملغ', 0, 'prescribed', {
    medication: 'Amlodipine 5 mg / أملوديبين 5 ملغ',
    directions: 'Per recorded prescription / حسب الوصفة المسجلة',
    quantity: '30',
    stockId: stock1,
    notes: '',
  });
  add(
    'surgery',
    'Elective arthroscopy',
    'تنظير مفصل اختياري',
    3,
    'scheduled',
    {
      procedure: 'Arthroscopy / تنظير المفصل',
      theatre: 'Theatre 01',
      checklist: 'Preparation pending / التحضير معلق',
      result: '',
    },
    'routine',
    '13:00',
  );
  [
    [0, 'issued', '85'],
    [1, 'draft', '120'],
    [4, 'paid', '65'],
    [5, 'paid', '210'],
    [3, 'issued', '450'],
  ].forEach((row) =>
    add('billing', 'Consultation & services', 'استشارة وخدمات', Number(row[0]), String(row[1]), {
      service: 'Clinical services / خدمات طبية',
      amount: String(row[2]),
      paymentMethod: 'Cash',
      notes: '',
    }),
  );
  add('insurance', 'Outpatient claim', 'مطالبة عيادات خارجية', 0, 'submitted', {
    payer: 'Demo Health / تأمين تجريبي',
    policy: 'POL-2048',
    amount: '85',
    notes: 'Manual claim tracking / متابعة يدوية للمطالبة',
  });
  add('procurement', 'Replenish examination gloves', 'إعادة توريد قفازات الفحص', -1, 'requested', {
    supplier: 'Medical Supply Co. / شركة مستلزمات طبية',
    items: '40 boxes of gloves / 40 علبة قفازات',
    amount: '240',
    notes: '',
  });
  add('housekeeping', 'Prepare room 204', 'تجهيز الغرفة 204', -1, 'pending', {
    location: 'Room 204 / الغرفة 204',
    service: 'Room turnover',
    notes: '',
  });
  add('equipment', 'Infusion pump inspection', 'فحص مضخة تسريب', -1, 'open', {
    asset: 'BIO-0082',
    location: 'Ward 2 / الجناح 2',
    issue: 'Scheduled preventive maintenance / صيانة وقائية مجدولة',
    result: '',
  });
  add('quality', 'Hand hygiene observation', 'مراقبة نظافة اليدين', -1, 'investigating', {
    category: 'Infection prevention',
    description: 'Monthly compliance review / مراجعة الالتزام الشهرية',
    result: '',
  });
  demoUsers.slice(1).forEach((u) =>
    add('staff', u.name, u.nameAr, -1, 'confirmed', {
      department:
        u.role === 'doctor' ? 'General medicine' : 'Hospital operations / عمليات المستشفى',
      shift: 'Morning',
      designation: u.role,
      contact: u.email,
    }),
  );
  return { patients, records };
}
