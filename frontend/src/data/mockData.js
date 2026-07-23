// ─── Mock Data for Orthopedic OPD ───────────────────────────────────────────
export const MOCK_PATIENTS = [
  {
    id: 'p001', name: 'Ahmad Al-Rashid', age: 52, gender: 'Male',
    dob: '1972-03-14', phone: '+962-79-123-4567', mrn: 'MRN-001234',
    email: 'ahmad.rashid@email.com', address: 'Amman, Jordan',
    bloodType: 'A+', allergies: 'Penicillin',
    appointmentTime: '09:00 AM', appointmentDate: '2026-05-15',
    status: 'pending', bodyArea: 'Knee',
    avatar: '#1a6fdb',
    assessments: [
      {
        id: 'a000', date: '2026-02-10', type: 'Initial Intake',
        score: 85, maxScore: 100, bodyArea: 'Knee', completedBy: 'Nurse Sara',
        answers: { pain_scale: 3 }
      },
      {
        id: 'a001a', date: '2026-04-01', type: 'Follow-Up',
        score: 65, maxScore: 100, bodyArea: 'Knee', completedBy: 'Nurse Maha',
        answers: { pain_scale: 5 }
      },
      {
        id: 'a001', date: '2026-05-10', type: 'Pre-Visit',
        score: 42, maxScore: 100,
        bodyArea: 'Knee', completedBy: 'Nurse Sara',
        chiefComplaint: 'ألم شديد في الركبة اليمنى عند المشي وصعود الدرج، مع تورم متكرر وتيبس صباحي.',
        answers: {
          dem_onset: 3, dem_surgery: 0, dem_injury: 1, dem_activity: 1,
          sym_swelling: 3, sym_locking: 2, sym_buckling: 3, sym_stiffness: 3,
          pain_rest: 3, pain_activity: 4, pain_night: 3, pain_scale: 7, pain_medication: 3,
          qdash_bend: 3, qdash_straighten: 2, qdash_walk: 3, qdash_stairs: 3, qdash_sleep: 3, qdash_work: 3,
          qol_daily: 3, qol_aid: 1, qol_social: 3, qol_overall: 3, qol_mood: 3,
          oth_physio: 2, oth_injection: 1
        }
      }
    ],
    evaluations: [
      {
        id: 'ev001', date: '2026-05-10', physician: 'Dr. Khalid Mansour',
        notes: 'Severe knee degeneration noted. Possible ligament damage. ROM reduced to 60 degrees.',
        diagnosis: 'Osteoarthritis Grade 3', audioUrl: null
      }
    ],
    diagnostics: [
      { id: 'd001', type: 'X-Ray', date: '2026-05-10', status: 'completed', result: 'Grade 3 osteoarthritis, joint space narrowing.' },
      { id: 'd002', type: 'MRI', date: '2026-05-12', status: 'pending', result: null }
    ],
    treatments: [
      {
        id: 't001', type: 'Medication', date: '2026-05-10', physician: 'Dr. Khalid Mansour',
        duration: '3 months', details: 'Diclofenac 75mg twice daily. Physiotherapy 3x/week.',
        followUpDate: '2026-07-01', status: 'active'
      }
    ]
  },
  {
    id: 'p002', name: 'Fatima Al-Zahrawi', age: 34, gender: 'Female',
    dob: '1992-07-22', phone: '+962-77-234-5678', mrn: 'MRN-001235',
    email: 'fatima.z@email.com', address: 'Zarqa, Jordan',
    bloodType: 'O-', allergies: 'None',
    appointmentTime: '10:30 AM', appointmentDate: '2026-05-15',
    status: 'assessment-completed', bodyArea: 'Shoulder',
    avatar: '#10b981',
    assessments: [
      {
        id: 'a002a', date: '2026-03-15', type: 'Initial Intake',
        score: 48, maxScore: 100, bodyArea: 'Shoulder', completedBy: 'Nurse Maha',
        answers: { pain_scale: 7 }
      },
      {
        id: 'a002', date: '2026-05-14', type: 'Pre-Visit',
        score: 74, maxScore: 100,
        bodyArea: 'Shoulder', completedBy: 'Nurse Sara',
        chiefComplaint: 'ألم في الكتف الأيمن يزداد عند رفع الذراع أعلى من مستوى الرأس أو الوصول خلف الظهر.',
        answers: {
          dem_onset: 2, dem_surgery: 0, dem_injury: 1, dem_dominant: 0, dem_affected: 0,
          sym_raise: 2, sym_behind: 2, sym_weakness: 2, sym_clicking: 2, sym_numbness: 1,
          pain_rest: 2, pain_activity: 3, pain_night: 2, pain_scale: 5,
          qdash_overhead: 3, qdash_dressing: 2, qdash_carry: 3, qdash_sleep: 2, qdash_work: 2,
          qol_instability: 2, qol_sport: 2, qol_overall: 2,
          oth_physio: 4, oth_work: 2
        }
      }
    ],
    evaluations: [], diagnostics: [], treatments: []
  },
  {
    id: 'p003', name: 'Omar Tawfiq', age: 67, gender: 'Male',
    dob: '1959-01-05', phone: '+962-78-345-6789', mrn: 'MRN-001236',
    email: 'omar.t@email.com', address: 'Irbid, Jordan',
    bloodType: 'B+', allergies: 'Aspirin, NSAIDs',
    appointmentTime: '11:00 AM', appointmentDate: '2026-05-15',
    status: 'follow-up', bodyArea: 'Spine',
    avatar: '#f59e0b',
    assessments: [
      {
        id: 'a003', date: '2026-04-01', type: 'Pre-Visit', score: 54, maxScore: 100,
        bodyArea: 'Spine', completedBy: 'Nurse Maha', answers: { pain_scale: 6 }
      },
      {
        id: 'a004', date: '2026-05-14', type: 'Follow-Up', score: 82, maxScore: 100,
        bodyArea: 'Spine', completedBy: 'Nurse Sara',
        chiefComplaint: 'تحسن ملحوظ في ألم أسفل الظهر بعد العلاج الطبيعي، مع انخفاض الألم الممتد للساق.',
        answers: {
          dem_onset: 3, dem_surgery: 0, dem_injury: 1, dem_region: 0,
          sym_radiation: 1, sym_numbness: 1, sym_weakness: 1, sym_bladder: 0, sym_cough: 1,
          pain_rest: 1, pain_activity: 2, pain_night: 1, pain_scale: 3,
          qdash_sit: 1, qdash_stand: 1, qdash_bend: 2, qdash_sleep: 1, qdash_work: 1,
          qol_morning: 1, qol_work: 1, qol_overall: 1,
          oth_physio: 2
        }
      }
    ],
    evaluations: [
      {
        id: 'ev002', date: '2026-04-02', physician: 'Dr. Khalid Mansour',
        notes: 'L4-L5 disc herniation confirmed. Conservative treatment initiated.',
        diagnosis: 'Lumbar Disc Herniation L4-L5', audioUrl: null
      }
    ],
    diagnostics: [
      { id: 'd003', type: 'MRI', date: '2026-04-03', status: 'completed', result: 'L4-L5 disc herniation with mild nerve root compression.' },
      { id: 'd004', type: 'X-Ray', date: '2026-04-03', status: 'completed', result: 'Mild degenerative changes.' }
    ],
    treatments: [
      {
        id: 't002', type: 'Physiotherapy', date: '2026-04-02', physician: 'Dr. Khalid Mansour',
        duration: '6 weeks', details: 'Physiotherapy 3x/week. Pain management with NSAIDs.',
        followUpDate: '2026-05-15', status: 'active'
      }
    ]
  },
  {
    id: 'p004', name: 'Layla Hassan', age: 28, gender: 'Female',
    dob: '1998-11-30', phone: '+962-79-456-7890', mrn: 'MRN-001237',
    email: 'layla.h@email.com', address: 'Aqaba, Jordan',
    bloodType: 'AB+', allergies: 'None',
    appointmentTime: '01:00 PM', appointmentDate: '2026-05-15',
    status: 'pending', bodyArea: 'Knee',
    avatar: '#6366f1',
    assessments: [
      {
        id: 'a004b', date: '2026-05-15', type: 'Pre-Visit', score: 60, maxScore: 100,
        bodyArea: 'Knee', completedBy: 'Nurse Sara',
        chiefComplaint: 'ألم خفيف إلى متوسط في الركبة بعد التمارين الرياضية.',
        answers: {
          dem_onset: 1, dem_surgery: 0, dem_injury: 4, dem_activity: 3,
          sym_swelling: 1, sym_locking: 0, sym_buckling: 1, sym_stiffness: 1,
          pain_rest: 1, pain_activity: 3, pain_night: 1, pain_scale: 4, pain_medication: 1,
          qdash_bend: 1, qdash_straighten: 1, qdash_walk: 1, qdash_stairs: 2, qdash_sleep: 1, qdash_work: 1,
          qol_daily: 1, qol_aid: 0, qol_social: 1, qol_overall: 1, qol_mood: 1,
          oth_physio: 0
        }
      }
    ],
    evaluations: [], diagnostics: [], treatments: []
  },
  {
    id: 'p005', name: 'Yousef Al-Khatib', age: 45, gender: 'Male',
    dob: '1981-06-18', phone: '+962-77-567-8901', mrn: 'MRN-001238',
    email: 'yousef.k@email.com', address: 'Salt, Jordan',
    bloodType: 'A-', allergies: 'Codeine',
    appointmentTime: '02:30 PM', appointmentDate: '2026-05-15',
    status: 'completed', bodyArea: 'Shoulder',
    avatar: '#ef4444',
    assessments: [
      {
        id: 'a005', date: '2026-05-01', type: 'Pre-Visit', score: 45, maxScore: 100,
        bodyArea: 'Shoulder', completedBy: 'Nurse Maha',
        chiefComplaint: 'ألم شديد في الكتف الأيسر ومحدودية حادة في الحركة.',
        answers: {
          dem_onset: 3, dem_surgery: 0, dem_injury: 2, dem_dominant: 0, dem_affected: 1,
          sym_raise: 4, sym_behind: 4, sym_weakness: 4, sym_clicking: 3, sym_numbness: 2,
          pain_rest: 4, pain_activity: 5, pain_night: 4, pain_scale: 8,
          qdash_overhead: 4, qdash_dressing: 3, qdash_carry: 4, qdash_sleep: 4, qdash_work: 4,
          qol_instability: 3, qol_sport: 0, qol_overall: 4,
          oth_physio: 1, oth_work: 4
        }
      }
    ],
    evaluations: [
      {
        id: 'ev003', date: '2026-05-02', physician: 'Dr. Khalid Mansour',
        notes: 'Rotator cuff tear confirmed. Surgical consultation recommended.',
        diagnosis: 'Rotator Cuff Partial Tear', audioUrl: null
      }
    ],
    diagnostics: [
      { id: 'd005', type: 'MRI', date: '2026-05-02', status: 'completed', result: 'Partial rotator cuff tear, supraspinatus tendon.' }
    ],
    treatments: [
      {
        id: 't003', type: 'Surgery', date: '2026-05-03', physician: 'Dr. Khalid Mansour',
        duration: '3 months recovery', details: 'Arthroscopic surgery scheduled. Pre-op assessment pending.',
        followUpDate: '2026-08-15', status: 'scheduled'
      }
    ]
  }
];

// ─── Rich Assessment Config ───────────────────────────────────────────────────
export const ASSESSMENT_CONFIG = {
  Knee: {
    id: 'knee-intake',
    title: 'تقييم الركبة — PROM',
    description: 'يرجى الإجابة على جميع الأسئلة بصدق. إجاباتك تساعدنا في تقديم أفضل رعاية ممكنة.',
    sections: [
      {
        id: 'demographics',
        title: 'البيانات الأساسية',
        icon: 'User',
        questions: [
          {
            id: 'dem_onset', type: 'radio', required: true,
            text: 'متى بدأ ألم ركبتك؟',
            description: 'اختر الخيار الذي يصف بشكل أفضل متى بدأت أعراضك.',
            options: ['أقل من أسبوع', '1–4 أسابيع', '1–3 أشهر', '3–6 أشهر', '6–12 شهراً', 'أكثر من سنة']
          },
          {
            id: 'dem_surgery', type: 'radio', required: true,
            text: 'هل أجريت عملية جراحية سابقة في الركبة؟',
            options: ['لا', 'نعم — عملية واحدة', 'نعم — عمليتان', 'نعم — 3 عمليات', 'نعم — 4 أو أكثر']
          },
          {
            id: 'dem_injury', type: 'radio', required: true,
            text: 'هل كان بداية الألم مرتبطة بإصابة؟',
            options: ['لا توجد إصابة', 'إصابة خفيفة', 'صدمة متوسطة', 'صدمة شديدة', 'إصابة رياضية', 'إصابة في العمل', 'حادث سيارة']
          },
          {
            id: 'dem_occupation', type: 'text', required: false,
            text: 'ما هي مهنتك الحالية؟',
            description: 'اختياري — يساعدنا في فهم متطلبات نشاطك.',
            placeholder: 'مثلاً: مدرس، عامل بناء، موظف مكتب'
          },
          {
            id: 'dem_activity', type: 'radio', required: true,
            text: 'كيف تصف مستوى نشاطك الجسدي المعتاد؟',
            options: ['خامل (جالس في معظم الوقت)', 'نشاط خفيف (المشي)', 'نشاط متوسط', 'نشيط (تمرين منتظم)', 'عمل جسدي شاق', 'رياضة تنافسية']
          }
        ]
      },
      {
        id: 'symptoms',
        title: 'الأعراض',
        icon: 'Activity',
        questions: [
          {
            id: 'sym_swelling', type: 'radio', required: true,
            text: 'هل تعاني من تورم في الركبة؟',
            options: ['لا يوجد تورم', 'تورم أحياناً', 'تورم أسبوعي', 'تورم متكرر', 'تورم يومي', 'تورم مستمر']
          },
          {
            id: 'sym_locking', type: 'radio', required: true,
            text: 'هل تعاني من تقييد أو انحشار في الركبة؟',
            description: 'التقييد يعني أن الركبة تنغلق ولا يمكن تمديدها بالكامل.',
            options: ['أبداً', 'نادراً', 'أحياناً', 'كثيراً']
          },
          {
            id: 'sym_buckling', type: 'radio', required: true,
            text: 'هل تعرضت ركبتك للانخلاع (الانطواء) أثناء النشاط؟',
            options: ['أبداً', 'مرة أو مرتين', 'نادراً (شهرياً)', 'أحياناً (أسبوعياً)', 'بشكل متكرر', 'في كل نشاط تقريباً']
          },
          {
            id: 'sym_stiffness', type: 'radio', required: true,
            text: 'هل تعاني من تيبس صباحي في الركبة؟',
            options: ['لا يوجد تيبس', 'أقل من 15 دقيقة', '15–30 دقيقة', '30–60 دقيقة', 'ساعة إلى ساعتين', 'أكثر من ساعتين']
          },
          {
            id: 'sym_description', type: 'textarea', required: false,
            text: 'صف أي أعراض أخرى تعاني منها.',
            placeholder: 'مثلاً: أصوات طقطقة، دفء، احمرار، تنميل...',
            description: 'أي تفاصيل إضافية ستساعد طبيبك.'
          }
        ]
      },
      {
        id: 'pain',
        title: 'تقييم الألم',
        icon: 'Zap',
        scoring: true,
        questions: [
          {
            id: 'pain_rest', type: 'radio', required: true,
            text: 'كيف تقيّم ألم ركبتك في حالة الراحة؟',
            description: 'ضع في اعتبارك الألم عند الجلوس أو الاستلقاء أو الاسترخاء.',
            options: ['لا ألم', 'ألم خفيف جداً', 'ألم خفيف', 'ألم متوسط', 'ألم شديد', 'ألم شديد جداً'],
            scoreValues: [0, 1, 2, 3, 4, 5]
          },
          {
            id: 'pain_activity', type: 'radio', required: true,
            text: 'كيف تقيّم ألم ركبتك أثناء النشاط؟',
            description: 'ضع في اعتبارك الألم عند المشي أو صعود الدرج أو ممارسة الرياضة.',
            options: ['لا ألم', 'ألم خفيف جداً', 'ألم خفيف', 'ألم متوسط', 'ألم شديد', 'ألم شديد جداً'],
            scoreValues: [0, 1, 2, 3, 4, 5]
          },
          {
            id: 'pain_night', type: 'radio', required: true,
            text: 'هل تعاني من ألم ليلي يؤثر على نومك؟',
            options: ['لا يوجد ألم ليلي', 'نادراً (مرة في الشهر)', 'أحياناً (أسبوعياً)', 'متكرر (عدة مرات/أسبوع)', 'في كل ليلة تقريباً', 'كل ليلة'],
            scoreValues: [0, 1, 2, 3, 4, 5]
          },
          {
            id: 'pain_scale', type: 'numeric', required: true,
            text: 'على مقياس من 0 إلى 10، ما هو متوسط مستوى الألم لديك هذا الأسبوع؟',
            description: '0 = لا ألم، 10 = أشد ألم يمكن تخيله',
            min: 0, max: 10, step: 1,
            scoreValues: null
          },
          {
            id: 'pain_medication', type: 'radio', required: true,
            text: 'هل تتناول حالياً أدوية لتسكين ألم الركبة؟',
            options: ['لا أدوية', 'أدوية بدون وصفة (أحياناً)', 'أدوية بدون وصفة (بانتظام)', 'دواء بوصفة طبية (أحياناً)', 'دواء بوصفة طبية (يومياً)', 'أدوية متعددة بوصفة طبية'],
            scoreValues: [0, 1, 2, 3, 4, 5]
          }
        ]
      },
      {
        id: 'quickdash',
        title: 'QuickDASH',
        icon: 'BarChart2',
        scoring: true,
        scoreCalculation: 'quickdash',
        description: 'يرجى تقييم قدرتك على أداء الأنشطة التالية خلال الأسبوع الماضي.',
        questions: [
          {
            id: 'qdash_bend', type: 'radio', required: true,
            text: 'هل تستطيع ثني ركبتك بالكامل؟',
            options: ['بدون صعوبة', 'صعوبة خفيفة', 'صعوبة متوسطة', 'صعوبة شديدة', 'غير قادر على الأداء'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_straighten', type: 'radio', required: true,
            text: 'هل تستطيع تمديد ركبتك بالكامل؟',
            options: ['بدون صعوبة', 'صعوبة خفيفة', 'صعوبة متوسطة', 'صعوبة شديدة', 'غير قادر على الأداء'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_walk', type: 'radio', required: true,
            text: 'ما المسافة التي تستطيع المشي فيها دون ألم شديد؟',
            description: 'خلال الأسبوع الماضي.',
            options: ['أكثر من 1 كم', '500 م – 1 كم', '100 م – 500 م', 'أقل من 100 م', 'غير قادر على المشي'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_stairs', type: 'radio', required: true,
            text: 'هل تستطيع صعود الدرج؟',
            options: ['بدون صعوبة', 'صعوبة خفيفة', 'صعوبة متوسطة', 'صعوبة شديدة', 'غير قادر على الأداء'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_sleep', type: 'radio', required: true,
            text: 'خلال الأسبوع الماضي، ما مقدار الصعوبة التي واجهتها في النوم بسبب ألم ركبتك؟',
            options: ['بدون صعوبة', 'صعوبة خفيفة', 'صعوبة متوسطة', 'صعوبة شديدة', 'غير قادر على النوم'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_work', type: 'radio', required: true,
            text: 'خلال الأسبوع الماضي، إلى أي مدى أثرت مشكلة ركبتك على عملك؟',
            options: ['لم تؤثر إطلاقاً', 'تأثير طفيف', 'تأثير متوسط', 'تأثير كبير', 'تأثير بالغ'],
            scoreValues: [1, 2, 3, 4, 5]
          }
        ]
      },
      {
        id: 'qol',
        title: 'جودة الحياة',
        icon: 'Heart',
        questions: [
          {
            id: 'qol_daily', type: 'radio', required: true,
            text: 'كيف يؤثر ألم الركبة على أنشطتك اليومية؟',
            options: ['لا تأثير', 'تأثير خفيف جداً', 'تأثير خفيف', 'تأثير متوسط', 'تأثير كبير', 'لا أستطيع أداء أنشطتي اليومية']
          },
          {
            id: 'qol_aid', type: 'radio', required: true,
            text: 'هل تستخدم معيناً للمشي؟',
            options: ['لا حاجة لمعين', 'عصا أحياناً', 'عصا باستمرار', 'مشاية أحياناً', 'مشاية دائماً', 'كرسي متحرك']
          },
          {
            id: 'qol_social', type: 'radio', required: true,
            text: 'كيف أثرت مشكلة ركبتك على حياتك الاجتماعية؟',
            options: ['لم تتأثر', 'تأثير نادر', 'تأثير طفيف', 'تأثير متوسط', 'تأثير ملحوظ', 'تأثير شديد', 'عزلة تامة']
          },
          {
            id: 'qol_overall', type: 'radio', required: true,
            text: 'بشكل عام، كيف تأثرت جودة حياتك؟',
            options: ['لم تتأثر', 'تأثير طفيف', 'تأثير متوسط', 'تأثير شديد نسبياً', 'تأثير شديد جداً']
          },
          {
            id: 'qol_mood', type: 'radio', required: false,
            text: 'هل أثرت مشكلة ركبتك على مزاجك أو صحتك النفسية؟',
            options: ['لا إطلاقاً', 'نادراً', 'أحياناً', 'كثيراً', 'بشكل متكرر', 'بشكل ملحوظ', 'تأثير شديد جداً']
          }
        ]
      },
      {
        id: 'other',
        title: 'أخرى',
        icon: 'MoreHorizontal',
        questions: [
          {
            id: 'oth_conditions', type: 'checkbox', required: false,
            text: 'هل تعاني من أي من الحالات التالية المشخصة؟',
            description: 'اختر كل ما ينطبق.',
            options: ['هشاشة العظام (التنكسية)', 'التهاب المفاصل الروماتويدي', 'السكري', 'هشاشة العظام', 'أمراض القلب', 'لا شيء مما سبق']
          },
          {
            id: 'oth_physio', type: 'radio', required: true,
            text: 'هل خضعت للعلاج الطبيعي لهذه الركبة من قبل؟',
            options: ['أبداً', 'مرة واحدة (قصيرة)', 'مرة واحدة (كاملة)', 'مرتان', 'مرات متعددة (3+)', 'خاضع للعلاج حالياً']
          },
          {
            id: 'oth_injection', type: 'radio', required: false,
            text: 'هل تلقيت أي حقن في الركبة؟',
            options: ['لا', 'حقنة كورتيزون', 'حمض الهيالورونيك', 'علاج PRP', 'علاج بالخلايا الجذعية', 'أنواع متعددة من الحقن']
          },
          {
            id: 'oth_notes', type: 'textarea', required: false,
            text: 'هل هناك أي شيء آخر تود إطلاع الطبيب عليه؟',
            placeholder: 'أي مخاوف أو أسئلة أو تفاصيل إضافية...'
          }
        ]
      }
    ]
  },

  Shoulder: {
    id: 'shoulder-intake',
    title: 'تقييم الكتف — PROM',
    description: 'يرجى الإجابة على جميع الأسئلة بصدق حول حالة كتفك.',
    sections: [
      {
        id: 'demographics',
        title: 'البيانات الأساسية',
        icon: 'User',
        questions: [
          {
            id: 'dem_onset', type: 'radio', required: true,
            text: 'منذ متى وأنت تعاني من هذه المشكلة في الكتف؟',
            options: ['أقل من أسبوع', '1–4 أسابيع', '1–3 أشهر', '3–6 أشهر', '6–12 شهراً', 'أكثر من سنة', 'سنوات عديدة (مزمن)']
          },
          {
            id: 'dem_surgery', type: 'radio', required: true,
            text: 'هل أجريت عملية جراحية سابقة في الكتف؟',
            options: ['لا', 'نعم — مرة واحدة', 'نعم — مرتان', 'نعم — 3 مرات', 'نعم — 4 مرات أو أكثر']
          },
          {
            id: 'dem_injury', type: 'radio', required: true,
            text: 'هل كان الألم ناتجاً عن إصابة محددة؟',
            options: ['لا إصابة (تلقائي)', 'بداية تدريجية / إجهاد متكرر', 'حادثة محددة', 'إصابة رياضية', 'إصابة في العمل', 'حادث سيارة']
          },
          {
            id: 'dem_dominant', type: 'radio', required: true,
            text: 'ما هي يدك المهيمنة؟',
            options: ['اليمنى', 'اليسرى', 'كلتا اليدين']
          },
          {
            id: 'dem_affected', type: 'radio', required: true,
            text: 'أي كتف متأثر؟',
            options: ['الأيمن فقط', 'الأيسر فقط', 'كلا الكتفين']
          }
        ]
      },
      {
        id: 'symptoms',
        title: 'الأعراض',
        icon: 'Activity',
        questions: [
          {
            id: 'sym_raise', type: 'radio', required: true,
            text: 'هل تستطيع رفع ذراعك فوق مستوى الكتف؟',
            options: ['نعم، بالكامل وبدون ألم', 'نعم، بالكامل مع ألم خفيف', 'جزئياً (حتى 90°)', 'جزئياً (أقل من 90°)', 'فقط مع ألم شديد', 'لا أستطيع الرفع إطلاقاً']
          },
          {
            id: 'sym_behind', type: 'radio', required: true,
            text: 'هل تستطيع الوصول خلف ظهرك؟',
            options: ['نعم، بالكامل', 'نعم، مع انزعاج خفيف', 'جزئياً', 'فقط مع ألم شديد', 'لا أستطيع الوصول']
          },
          {
            id: 'sym_weakness', type: 'radio', required: true,
            text: 'هل تعاني من ضعف في الكتف؟',
            options: ['لا ضعف', 'ضعف خفيف جداً', 'ضعف خفيف', 'ضعف متوسط', 'ضعف ملحوظ', 'ضعف شديد', 'لا أستطيع رفع الذراع']
          },
          {
            id: 'sym_clicking', type: 'radio', required: true,
            text: 'هل تسمع صوت طقطقة أو فرقعة في الكتف؟',
            options: ['أبداً', 'نادراً (بضع مرات)', 'أحياناً (أسبوعياً)', 'كثيراً (يومياً)', 'في معظم الأوقات', 'دائماً مع الحركة']
          },
          {
            id: 'sym_numbness', type: 'radio', required: true,
            text: 'هل تعاني من تنميل أو وخز في ذراعك أو يدك؟',
            options: ['لا', 'نادراً', 'أحياناً', 'بشكل متكرر', 'في معظم الأوقات', 'باستمرار']
          }
        ]
      },
      {
        id: 'pain',
        title: 'تقييم الألم',
        icon: 'Zap',
        scoring: true,
        questions: [
          {
            id: 'pain_rest', type: 'radio', required: true,
            text: 'كيف تقيّم ألم كتفك في حالة الراحة؟',
            options: ['لا ألم', 'خفيف جداً', 'خفيف', 'متوسط', 'شديد', 'شديد جداً'],
            scoreValues: [0, 1, 2, 3, 4, 5]
          },
          {
            id: 'pain_activity', type: 'radio', required: true,
            text: 'كيف تقيّم ألم كتفك أثناء الحركة؟',
            options: ['لا ألم', 'خفيف جداً', 'خفيف', 'متوسط', 'شديد', 'شديد جداً'],
            scoreValues: [0, 1, 2, 3, 4, 5]
          },
          {
            id: 'pain_night', type: 'radio', required: true,
            text: 'هل تعاني من ألم ليلي يؤثر على نومك؟',
            options: ['لا', 'نادراً', 'أحياناً', 'بشكل متكرر', 'في معظم الليالي', 'كل ليلة'],
            scoreValues: [0, 1, 2, 3, 4, 5]
          },
          {
            id: 'pain_scale', type: 'numeric', required: true,
            text: 'قيّم متوسط مستوى الألم هذا الأسبوع (0–10).',
            description: '0 = لا ألم، 10 = أشد ألم يمكن تخيله',
            min: 0, max: 10, step: 1
          }
        ]
      },
      {
        id: 'quickdash',
        title: 'QuickDASH',
        icon: 'BarChart2',
        scoring: true,
        scoreCalculation: 'quickdash',
        description: 'قيّم قدرتك على أداء الأنشطة التالية خلال الأسبوع الماضي.',
        questions: [
          {
            id: 'qdash_overhead', type: 'radio', required: true,
            text: 'هل تستطيع أداء الأنشطة فوق مستوى الرأس (مثل الوصول لرف مرتفع)؟',
            options: ['بدون صعوبة', 'صعوبة خفيفة', 'صعوبة متوسطة', 'صعوبة شديدة', 'غير قادر على الأداء'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_dressing', type: 'radio', required: true,
            text: 'ما مقدار الصعوبة التي تواجهها في ارتداء ملابسك؟',
            options: ['بدون صعوبة', 'صعوبة خفيفة', 'صعوبة متوسطة', 'صعوبة شديدة', 'غير قادر على الأداء'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_carry', type: 'radio', required: true,
            text: 'هل تستطيع حمل حقيبة أو جسم ثقيل؟',
            options: ['بدون صعوبة', 'صعوبة خفيفة', 'صعوبة متوسطة', 'صعوبة شديدة', 'غير قادر على الأداء'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_sleep', type: 'radio', required: true,
            text: 'ما مقدار الصعوبة التي واجهتها في النوم بسبب ألم الكتف؟',
            options: ['بدون صعوبة', 'صعوبة خفيفة', 'صعوبة متوسطة', 'صعوبة شديدة', 'غير قادر على النوم'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_work', type: 'radio', required: true,
            text: 'إلى أي مدى أثرت مشكلة كتفك على عملك؟',
            options: ['لم تؤثر إطلاقاً', 'تأثير طفيف', 'تأثير متوسط', 'تأثير كبير', 'تأثير بالغ'],
            scoreValues: [1, 2, 3, 4, 5]
          }
        ]
      },
      {
        id: 'qol',
        title: 'جودة الحياة',
        icon: 'Heart',
        questions: [
          {
            id: 'qol_instability', type: 'radio', required: true,
            text: 'هل تشعر أن كتفك غير مستقر (كأنه قد يخرج من مكانه)؟',
            options: ['لا عدم استقرار', 'نادر جداً', 'نادر', 'أحياناً', 'كثيراً', 'بشكل متكرر', 'خرج من مكانه فعلاً']
          },
          {
            id: 'qol_sport', type: 'radio', required: false,
            text: 'هل تمارس الرياضة أو الأنشطة الترفيهية؟',
            options: ['لا رياضة / خامل', 'نشاط ترفيهي خفيف', 'تمرين منتظم متوسط', 'رياضة منتظمة (ترفيهية)', 'رياضة تنافسية هاوية', 'رياضي محترف / نخبوي']
          },
          {
            id: 'qol_overall', type: 'radio', required: true,
            text: 'كيف أثرت مشكلة كتفك على جودة حياتك بشكل عام؟',
            options: ['لم تتأثر', 'تأثير طفيف جداً', 'تأثير طفيف', 'تأثير متوسط', 'تأثير شديد']
          }
        ]
      },
      {
        id: 'other',
        title: 'أخرى',
        icon: 'MoreHorizontal',
        questions: [
          {
            id: 'oth_conditions', type: 'checkbox', required: false,
            text: 'هل تعاني من أي من الحالات التالية المشخصة؟',
            description: 'اختر كل ما ينطبق.',
            options: ['السكري', 'التهاب المفاصل الروماتويدي', 'هشاشة العظام', 'أمراض القلب', 'لا شيء مما سبق']
          },
          {
            id: 'oth_physio', type: 'radio', required: true,
            text: 'هل خضعت للعلاج الطبيعي لهذا الكتف من قبل؟',
            options: ['أبداً', 'مرة واحدة (قصيرة)', 'مرة واحدة (كاملة)', 'مرتان', 'مرات متعددة (3+)', 'خاضع للعلاج حالياً']
          },
          {
            id: 'oth_work', type: 'radio', required: true,
            text: 'كيف تأثر عملك؟',
            options: ['لم يتأثر', 'تقييد خفيف جداً', 'تقييد خفيف', 'تقييد متوسط', 'تقييد ملحوظ', 'لا أستطيع العمل']
          },
          {
            id: 'oth_notes', type: 'textarea', required: false,
            text: 'هل هناك أي شيء آخر تود إطلاع الطبيب عليه؟',
            placeholder: 'أي مخاوف أو تفاصيل إضافية...'
          }
        ]
      }
    ]
  },

  Spine: {
    id: 'spine-intake',
    title: 'تقييم العمود الفقري — PROM',
    description: 'يرجى الإجابة على جميع الأسئلة بصدق حول حالة ظهرك أو رقبتك.',
    sections: [
      {
        id: 'demographics',
        title: 'البيانات الأساسية',
        icon: 'User',
        questions: [
          {
            id: 'dem_onset', type: 'radio', required: true,
            text: 'منذ متى وأنت تعاني من هذه المشكلة في العمود الفقري؟',
            options: ['أقل من أسبوع', '1–4 أسابيع', '1–3 أشهر', '3–6 أشهر', '6–12 شهراً', 'أكثر من سنة', 'سنوات عديدة (مزمن)']
          },
          {
            id: 'dem_surgery', type: 'radio', required: true,
            text: 'هل أجريت عملية جراحية سابقة في العمود الفقري؟',
            options: ['لا', 'نعم — مرة واحدة', 'نعم — مرتان', 'نعم — 3 مرات', 'نعم — 4 مرات أو أكثر']
          },
          {
            id: 'dem_injury', type: 'radio', required: true,
            text: 'هل كانت البداية مرتبطة بإصابة؟',
            options: ['لا إصابة (تلقائي)', 'إصابة رفع / انحناء', 'إصابة رياضية', 'حادث سيارة / صدمة', 'إصابة في العمل', 'بداية تدريجية / وضعية']
          },
          {
            id: 'dem_region', type: 'radio', required: true,
            text: 'أي منطقة هي الأكثر تأثراً؟',
            options: ['أسفل الظهر (قطني)', 'وسط الظهر (صدري)', 'الرقبة (عنقي)', 'أسفل + وسط الظهر', 'الرقبة + أعلى الظهر', 'مناطق متعددة', 'العمود الفقري بأكمله']
          }
        ]
      },
      {
        id: 'symptoms',
        title: 'الأعراض',
        icon: 'Activity',
        questions: [
          {
            id: 'sym_radiation', type: 'radio', required: true,
            text: 'هل تعاني من ألم ينتشر نزولاً إلى ساقك أو ذراعك؟',
            options: ['لا انتشار', 'نادراً', 'أحياناً', 'بشكل متكرر', 'في معظم الأوقات', 'باستمرار']
          },
          {
            id: 'sym_numbness', type: 'radio', required: true,
            text: 'هل تعاني من تنميل أو وخز في أطرافك؟',
            options: ['لا', 'نادراً', 'أحياناً', 'بشكل متكرر', 'في معظم الأوقات', 'باستمرار']
          },
          {
            id: 'sym_weakness', type: 'radio', required: true,
            text: 'هل تعاني من ضعف عضلي في ذراعيك أو ساقيك؟',
            options: ['لا ضعف', 'خفيف جداً', 'خفيف', 'متوسط', 'ملحوظ', 'ضعف شديد']
          },
          {
            id: 'sym_bladder', type: 'radio', required: true,
            text: 'هل تعاني من أي مشاكل في المثانة أو الأمعاء؟',
            description: 'مهم لاستبعاد الحالات الخطيرة.',
            options: ['لا شيء', 'إلحاح بولي أحياناً', 'إلحاح معوي أحياناً', 'مشاكل بولية متكررة', 'مشاكل معوية متكررة', 'فقدان السيطرة على المثانة', 'فقدان السيطرة على الأمعاء']
          },
          {
            id: 'sym_cough', type: 'radio', required: false,
            text: 'هل يزداد الألم عند السعال أو العطس؟',
            options: ['لا', 'نادراً (بين الحين والآخر)', 'أحياناً (أسبوعياً)', 'كثيراً', 'في معظم الأوقات', 'دائماً']
          }
        ]
      },
      {
        id: 'pain',
        title: 'تقييم الألم',
        icon: 'Zap',
        scoring: true,
        questions: [
          {
            id: 'pain_rest', type: 'radio', required: true,
            text: 'كيف تقيّم ألم ظهرك / رقبتك في حالة الراحة؟',
            options: ['لا ألم', 'خفيف جداً', 'خفيف', 'متوسط', 'شديد', 'شديد جداً'],
            scoreValues: [0, 1, 2, 3, 4, 5]
          },
          {
            id: 'pain_activity', type: 'radio', required: true,
            text: 'كيف تقيّم الألم أثناء النشاط؟',
            options: ['لا ألم', 'خفيف جداً', 'خفيف', 'متوسط', 'شديد', 'شديد جداً'],
            scoreValues: [0, 1, 2, 3, 4, 5]
          },
          {
            id: 'pain_night', type: 'radio', required: true,
            text: 'هل تعاني من ألم ليلي؟',
            options: ['لا', 'نادراً', 'أحياناً', 'بشكل متكرر', 'في معظم الليالي', 'كل ليلة'],
            scoreValues: [0, 1, 2, 3, 4, 5]
          },
          {
            id: 'pain_scale', type: 'numeric', required: true,
            text: 'قيّم متوسط مستوى الألم هذا الأسبوع (0–10).',
            min: 0, max: 10, step: 1
          }
        ]
      },
      {
        id: 'quickdash',
        title: 'QuickDASH',
        icon: 'BarChart2',
        scoring: true,
        scoreCalculation: 'quickdash',
        description: 'قيّم قدرتك على أداء الأنشطة التالية خلال الأسبوع الماضي.',
        questions: [
          {
            id: 'qdash_sit', type: 'radio', required: true,
            text: 'كم من الوقت تستطيع الجلوس بشكل مريح؟',
            options: ['أكثر من ساعة', '30–60 دقيقة', '10–30 دقيقة', 'أقل من 10 دقائق', 'لا أستطيع الجلوس'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_stand', type: 'radio', required: true,
            text: 'كم من الوقت تستطيع الوقوف بشكل مريح؟',
            options: ['أكثر من ساعة', '30–60 دقيقة', '10–30 دقيقة', 'أقل من 10 دقائق', 'لا أستطيع الوقوف'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_bend', type: 'radio', required: true,
            text: 'هل تستطيع الانحناء للأمام بشكل مريح؟',
            options: ['بدون صعوبة', 'صعوبة خفيفة', 'صعوبة متوسطة', 'صعوبة شديدة', 'لا أستطيع الانحناء'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_sleep', type: 'radio', required: true,
            text: 'ما مقدار الصعوبة التي واجهتها في النوم بسبب ألم العمود الفقري؟',
            options: ['بدون صعوبة', 'صعوبة خفيفة', 'صعوبة متوسطة', 'صعوبة شديدة', 'غير قادر على النوم'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_work', type: 'radio', required: true,
            text: 'إلى أي مدى أثرت مشكلة عمودك الفقري على عملك؟',
            options: ['لم تؤثر إطلاقاً', 'تأثير طفيف', 'تأثير متوسط', 'تأثير كبير', 'تأثير بالغ'],
            scoreValues: [1, 2, 3, 4, 5]
          }
        ]
      },
      {
        id: 'qol',
        title: 'جودة الحياة',
        icon: 'Heart',
        questions: [
          {
            id: 'qol_morning', type: 'radio', required: true,
            text: 'هل تعاني من تيبس صباحي؟',
            options: ['لا', 'أقل من 15 دقيقة', '15–30 دقيقة', '30–60 دقيقة', 'ساعة إلى ساعتين', 'أكثر من ساعتين']
          },
          {
            id: 'qol_work', type: 'radio', required: true,
            text: 'كيف تأثر عملك؟',
            options: ['لم يتأثر', 'تقييد خفيف جداً', 'تقييد خفيف', 'تقييد متوسط', 'تقييد ملحوظ', 'لا أستطيع العمل']
          },
          {
            id: 'qol_overall', type: 'radio', required: true,
            text: 'كيف تأثرت جودة حياتك بشكل عام؟',
            options: ['لم تتأثر', 'تأثير طفيف', 'تأثير متوسط', 'تأثير ملحوظ', 'تأثير شديد']
          }
        ]
      },
      {
        id: 'other',
        title: 'أخرى',
        icon: 'MoreHorizontal',
        questions: [
          {
            id: 'oth_conditions', type: 'checkbox', required: false,
            text: 'هل تعاني من أي من الحالات التالية المشخصة؟',
            description: 'اختر كل ما ينطبق.',
            options: ['هشاشة العظام', 'السكري', 'التهاب المفاصل الروماتويدي', 'أمراض القلب', 'لا شيء مما سبق']
          },
          {
            id: 'oth_physio', type: 'radio', required: true,
            text: 'هل خضعت للعلاج الطبيعي لهذه الحالة من قبل؟',
            options: ['أبداً', 'مرة واحدة (قصيرة)', 'مرة واحدة (كاملة)', 'مرتان', 'مرات متعددة (3+)', 'خاضع للعلاج حالياً']
          },
          {
            id: 'oth_notes', type: 'textarea', required: false,
            text: 'هل هناك أي شيء آخر تود إطلاع الطبيب عليه؟',
            placeholder: 'أي مخاوف أو تفاصيل إضافية...'
          }
        ]
      }
    ]
  },

  Other: {
    id: 'general-intake',
    title: 'التقييم العام — PROM',
    description: 'يرجى الإجابة على جميع الأسئلة بصدق حول حالتك.',
    sections: [
      {
        id: 'demographics',
        title: 'البيانات الأساسية',
        icon: 'User',
        questions: [
          {
            id: 'dem_onset', type: 'radio', required: true,
            text: 'متى بدأت المشكلة؟',
            options: ['أقل من أسبوع', '1–4 أسابيع', '1–3 أشهر', '3–6 أشهر', '6–12 شهراً', 'أكثر من سنة']
          },
          {
            id: 'dem_injury', type: 'radio', required: true,
            text: 'هل كانت البداية مرتبطة بإصابة؟',
            options: ['لا', 'إصابة بسيطة', 'إصابة متوسطة', 'صدمة شديدة', 'إصابة رياضية', 'حادث سيارة', 'بداية تدريجية / وضعية']
          },
          {
            id: 'dem_surgery', type: 'radio', required: true,
            text: 'هل أجريت عملية جراحية سابقة لهذه الحالة؟',
            options: ['لا', 'نعم — مرة واحدة', 'نعم — مرتان', 'نعم — مرات متعددة', 'عملية مجدولة حالياً']
          }
        ]
      },
      {
        id: 'symptoms',
        title: 'الأعراض',
        icon: 'Activity',
        questions: [
          {
            id: 'sym_swelling', type: 'radio', required: true,
            text: 'هل تعاني من تورم في المنطقة المتأثرة؟',
            options: ['لا يوجد تورم', 'أحياناً', 'أسبوعياً', 'متكرر', 'يومي', 'مستمر']
          },
          {
            id: 'sym_numbness', type: 'radio', required: true,
            text: 'هل تعاني من تنميل أو وخز؟',
            options: ['لا', 'نادراً', 'أحياناً', 'بشكل متكرر', 'في معظم الأوقات', 'باستمرار']
          },
          {
            id: 'sym_recurring', type: 'radio', required: true,
            text: 'هل عانيت من هذه المشكلة من قبل؟',
            options: ['لا، أول مرة', 'مرة واحدة قصيرة من قبل', 'مرة واحدة (نوبة طويلة)', 'مرتان من قبل', 'مرات متعددة', 'حالة متكررة / مزمنة']
          }
        ]
      },
      {
        id: 'pain',
        title: 'تقييم الألم',
        icon: 'Zap',
        scoring: true,
        questions: [
          {
            id: 'pain_rest', type: 'radio', required: true,
            text: 'كيف تقيّم الألم في حالة الراحة؟',
            options: ['لا ألم', 'خفيف جداً', 'خفيف', 'متوسط', 'شديد', 'شديد جداً'],
            scoreValues: [0, 1, 2, 3, 4, 5]
          },
          {
            id: 'pain_activity', type: 'radio', required: true,
            text: 'كيف تقيّم الألم أثناء النشاط؟',
            options: ['لا ألم', 'خفيف جداً', 'خفيف', 'متوسط', 'شديد', 'شديد جداً'],
            scoreValues: [0, 1, 2, 3, 4, 5]
          },
          {
            id: 'pain_night', type: 'radio', required: true,
            text: 'هل تعاني من ألم ليلي؟',
            options: ['لا', 'نادراً', 'أحياناً', 'بشكل متكرر', 'في معظم الليالي', 'كل ليلة'],
            scoreValues: [0, 1, 2, 3, 4, 5]
          },
          {
            id: 'pain_scale', type: 'numeric', required: true,
            text: 'قيّم متوسط مستوى الألم هذا الأسبوع (0–10).',
            min: 0, max: 10, step: 1
          }
        ]
      },
      {
        id: 'quickdash',
        title: 'QuickDASH',
        icon: 'BarChart2',
        scoring: true,
        scoreCalculation: 'quickdash',
        description: 'قيّم قدرتك على أداء الأنشطة التالية خلال الأسبوع الماضي.',
        questions: [
          {
            id: 'qdash_daily', type: 'radio', required: true,
            text: 'كيف يؤثر الألم على أنشطتك اليومية؟',
            options: ['لا تأثير', 'صعوبة خفيفة', 'صعوبة متوسطة', 'صعوبة شديدة', 'لا أستطيع الأداء'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_sleep', type: 'radio', required: true,
            text: 'ما مقدار الصعوبة التي واجهتها في النوم بسبب الألم؟',
            options: ['بدون صعوبة', 'صعوبة خفيفة', 'صعوبة متوسطة', 'صعوبة شديدة', 'غير قادر على النوم'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_work', type: 'radio', required: true,
            text: 'إلى أي مدى أثرت مشكلتك على عملك؟',
            options: ['لم تؤثر إطلاقاً', 'تأثير طفيف', 'تأثير متوسط', 'تأثير كبير', 'تأثير بالغ'],
            scoreValues: [1, 2, 3, 4, 5]
          }
        ]
      },
      {
        id: 'qol',
        title: 'جودة الحياة',
        icon: 'Heart',
        questions: [
          {
            id: 'qol_aid', type: 'radio', required: true,
            text: 'هل تستخدم معيناً للمشي أو دعماً؟',
            options: ['لا', 'عصا أحياناً', 'عصا باستمرار', 'مشاية', 'كرسي متحرك أحياناً', 'كرسي متحرك دائماً']
          },
          {
            id: 'qol_overall', type: 'radio', required: true,
            text: 'كيف تأثرت جودة حياتك بشكل عام؟',
            options: ['لم تتأثر', 'تأثير طفيف جداً', 'تأثير طفيف', 'تأثير متوسط', 'تأثير ملحوظ', 'تأثير شديد']
          }
        ]
      },
      {
        id: 'other',
        title: 'أخرى',
        icon: 'MoreHorizontal',
        questions: [
          {
            id: 'oth_conditions', type: 'checkbox', required: false,
            text: 'هل تعاني من أي من الحالات التالية المشخصة؟',
            options: ['التهاب المفاصل', 'السكري', 'هشاشة العظام', 'أمراض القلب', 'لا شيء مما سبق']
          },
          {
            id: 'oth_physio', type: 'radio', required: true,
            text: 'هل خضعت للعلاج الطبيعي من قبل؟',
            options: ['أبداً', 'مرة واحدة (قصيرة)', 'مرة واحدة (كاملة)', 'مرات متعددة', 'خاضع للعلاج حالياً']
          },
          {
            id: 'oth_weather', type: 'radio', required: false,
            text: 'هل يؤثر الطقس على الألم؟',
            options: ['لا تأثير', 'الطقس البارد فقط', 'الطقس الرطب / الممطر', 'الطقس الحار', 'أي تغيير في الطقس', 'دائماً يتأثر بالطقس']
          },
          {
            id: 'oth_notes', type: 'textarea', required: false,
            text: 'هل هناك أي شيء آخر تود إطلاع الطبيب عليه؟',
            placeholder: 'أي مخاوف أو تفاصيل إضافية...'
          }
        ]
      }
    ]
  }
};

// Legacy format (kept for backward compatibility if needed)
export const ASSESSMENT_QUESTIONS = {
  Knee: ASSESSMENT_CONFIG.Knee.sections.flatMap(s => s.questions.map(q => ({
    id: q.id, text: q.text,
    options: q.options || ['No', 'Mild', 'Moderate', 'Severe']
  }))),
  Shoulder: ASSESSMENT_CONFIG.Shoulder.sections.flatMap(s => s.questions.map(q => ({
    id: q.id, text: q.text,
    options: q.options || ['No', 'Mild', 'Moderate', 'Severe']
  }))),
  Spine: ASSESSMENT_CONFIG.Spine.sections.flatMap(s => s.questions.map(q => ({
    id: q.id, text: q.text,
    options: q.options || ['No', 'Mild', 'Moderate', 'Severe']
  }))),
  Other: ASSESSMENT_CONFIG.Other.sections.flatMap(s => s.questions.map(q => ({
    id: q.id, text: q.text,
    options: q.options || ['No', 'Mild', 'Moderate', 'Severe']
  })))
};

export const BODY_AREAS = ['Knee', 'Shoulder', 'Spine', 'Other'];

export const STATUS_CONFIG = {
  pending:              { label: 'Pending Call',         class: 'badge-pending',   color: '#a16207' },
  'assessment-completed': { label: 'Assessment Completed', class: 'badge-active',    color: '#166534' },
  'follow-up':          { label: 'Follow-Up Required',   class: 'badge-followup',  color: '#5b21b6' },
  completed:            { label: 'Completed',             class: 'badge-completed', color: '#0369a1' }
};

export const DIAGNOSTIC_TESTS = [
  { id: 'xray',  name: 'X-Ray',           icon: '🦴', desc: 'Bone structure & fractures' },
  { id: 'mri',   name: 'MRI',             icon: '🧲', desc: 'Soft tissue, ligaments & discs' },
  { id: 'ct',    name: 'CT Scan',         icon: '🔬', desc: 'Cross-sectional bone imaging' },
  { id: 'lab',   name: 'Laboratory Tests',icon: '🧪', desc: 'Blood work & inflammatory markers' },
  { id: 'us',    name: 'Ultrasound',      icon: '📡', desc: 'Real-time soft tissue imaging' }
];

export const TREATMENT_OPTIONS = [
  { id: 'surgery',   name: 'Surgery',              icon: '🔪', desc: 'Surgical intervention for structural repair' },
  { id: 'medication',name: 'Medication',            icon: '💊', desc: 'Pharmacological pain and inflammation management' },
  { id: 'physio',    name: 'Physiotherapy',         icon: '🏃', desc: 'Structured rehabilitation and exercise program' },
  { id: 'injection', name: 'Injection Therapy',     icon: '💉', desc: 'Corticosteroid or PRP injections' },
  { id: 'rest',      name: 'Rest & Monitoring',     icon: '🛌', desc: 'Conservative management with follow-up' },
  { id: 'rehab',     name: 'Long-term Rehab',       icon: '♻️', desc: 'Extended rehabilitation program' }
];

// ─── Score Calculation Utilities ──────────────────────────────────────────────
export function calculateQuickDASH(answers, questions) {
  const scoredQuestions = questions.filter(q => q.scoreValues);
  if (scoredQuestions.length === 0) return null;
  
  const answered = scoredQuestions.filter(q => answers[q.id] !== undefined && answers[q.id] !== null);
  if (answered.length < scoredQuestions.length) return null;
  
  const sum = answered.reduce((acc, q) => {
    const idx = Array.isArray(answers[q.id]) ? answers[q.id][0] : answers[q.id];
    return acc + (q.scoreValues[idx] || 0);
  }, 0);
  
  // QuickDASH formula: (sum/n - 1) * 25, giving 0–100
  const score = ((sum / answered.length) - 1) * 25;
  return Math.round(score * 10) / 10;
}

export function calculateSectionScore(answers, questions) {
  const scoredQs = questions.filter(q => q.scoreValues);
  if (!scoredQs.length) return null;
  const total = scoredQs.reduce((acc, q) => {
    const idx = answers[q.id];
    if (idx === undefined || idx === null) return acc;
    return acc + (q.scoreValues[idx] || 0);
  }, 0);
  const max = scoredQs.reduce((acc, q) => acc + Math.max(...q.scoreValues), 0);
  return { score: total, max };
}
