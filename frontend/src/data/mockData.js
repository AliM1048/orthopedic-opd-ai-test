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
        id: 'a001', date: '2026-05-10', type: 'Pre-Visit',
        score: 14, maxScore: 20,
        bodyArea: 'Knee', completedBy: 'Nurse Sara',
        answers: { q1: 2, q2: 1, q3: 3, q4: 2 }
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
        id: 'a002', date: '2026-05-14', type: 'Pre-Visit',
        score: 11, maxScore: 20,
        bodyArea: 'Shoulder', completedBy: 'Nurse Sara',
        answers: { q1: 1, q2: 2, q3: 1, q4: 3 }
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
        id: 'a003', date: '2026-04-01', type: 'Pre-Visit', score: 16, maxScore: 20,
        bodyArea: 'Spine', completedBy: 'Nurse Maha', answers: {}
      },
      {
        id: 'a004', date: '2026-05-14', type: 'Follow-Up', score: 10, maxScore: 20,
        bodyArea: 'Spine', completedBy: 'Nurse Sara', answers: {}
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
    assessments: [], evaluations: [], diagnostics: [], treatments: []
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
      { id: 'a005', date: '2026-05-01', type: 'Pre-Visit', score: 8, maxScore: 20, bodyArea: 'Shoulder', completedBy: 'Nurse Maha', answers: {} }
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

export const ASSESSMENT_QUESTIONS = {
  Knee: [
    { id: 'q1', text: 'How would you rate your knee pain at rest?', options: ['No pain', 'Mild pain', 'Moderate pain', 'Severe pain'] },
    { id: 'q2', text: 'How would you rate your knee pain during activity?', options: ['No pain', 'Mild pain', 'Moderate pain', 'Severe pain'] },
    { id: 'q3', text: 'Can you fully bend your knee?', options: ['Yes, fully', 'Mostly but limited', 'Only slightly', 'Cannot bend'] },
    { id: 'q4', text: 'Can you fully straighten your knee?', options: ['Yes, fully', 'Mostly but limited', 'Only slightly', 'Cannot straighten'] },
    { id: 'q5', text: 'Do you experience swelling in the knee?', options: ['No swelling', 'Occasional', 'Frequent', 'Constant'] },
    { id: 'q6', text: 'Do you experience locking or catching in the knee?', options: ['Never', 'Rarely', 'Sometimes', 'Often'] },
    { id: 'q7', text: 'How far can you walk without significant pain?', options: ['More than 1 km', '500m - 1 km', '100m - 500m', 'Less than 100m'] },
    { id: 'q8', text: 'Can you climb stairs?', options: ['Yes, normally', 'With mild difficulty', 'With significant difficulty', 'Cannot climb'] },
    { id: 'q9', text: 'Do you use a walking aid?', options: ['None needed', 'Occasionally', 'Most of the time', 'Always required'] },
    { id: 'q10', text: 'Has the knee given way (buckled) during activity?', options: ['Never', 'Rarely', 'Sometimes', 'Frequently'] },
    { id: 'q11', text: 'Do you experience night pain affecting sleep?', options: ['No night pain', 'Occasional', 'Frequent', 'Every night'] },
    { id: 'q12', text: 'Have you had previous knee surgery?', options: ['No', 'Yes, 1 surgery', 'Yes, 2 surgeries', 'Yes, 3 or more'] },
    { id: 'q13', text: 'Are you currently taking pain medication for this knee?', options: ['No medication', 'OTC occasionally', 'OTC regularly', 'Prescription required'] },
    { id: 'q14', text: 'How does the pain affect your daily activities?', options: ['No impact', 'Mild impact', 'Moderate impact', 'Cannot perform daily activities'] },
    { id: 'q15', text: 'When did the pain start?', options: ['Less than 1 week', '1-4 weeks', '1-6 months', 'More than 6 months'] },
    { id: 'q16', text: 'Was the onset of pain related to an injury?', options: ['No injury', 'Mild injury', 'Significant trauma', 'Sports injury'] },
    { id: 'q17', text: 'Do you have any diagnosed conditions (e.g., arthritis, diabetes)?', options: ['None', 'Arthritis', 'Diabetes', 'Multiple conditions'] },
    { id: 'q18', text: 'Have you had physical therapy for this knee before?', options: ['Never', 'Once', 'Multiple times', 'Currently undergoing PT'] },
    { id: 'q19', text: 'How is your overall quality of life affected?', options: ['Not affected', 'Slightly affected', 'Moderately affected', 'Severely affected'] },
    { id: 'q20', text: 'What is your work/activity level?', options: ['Sedentary', 'Light activity', 'Moderate activity', 'Heavy physical work'] }
  ],
  Shoulder: [
    { id: 'q1', text: 'How would you rate your shoulder pain at rest?', options: ['No pain', 'Mild', 'Moderate', 'Severe'] },
    { id: 'q2', text: 'How would you rate your shoulder pain during movement?', options: ['No pain', 'Mild', 'Moderate', 'Severe'] },
    { id: 'q3', text: 'Can you raise your arm above shoulder height?', options: ['Yes, fully', 'Partially', 'Only with pain', 'Cannot raise'] },
    { id: 'q4', text: 'Can you reach behind your back?', options: ['Yes, fully', 'Partially', 'Only with pain', 'Cannot reach'] },
    { id: 'q5', text: 'Do you experience shoulder weakness?', options: ['No weakness', 'Mild weakness', 'Moderate weakness', 'Significant weakness'] },
    { id: 'q6', text: 'Do you experience clicking or popping in the shoulder?', options: ['Never', 'Rarely', 'Sometimes', 'Always'] },
    { id: 'q7', text: 'Do you have night pain affecting sleep?', options: ['No', 'Occasionally', 'Frequently', 'Every night'] },
    { id: 'q8', text: 'Can you perform overhead activities?', options: ['Yes, normally', 'With mild difficulty', 'With great difficulty', 'Cannot perform'] },
    { id: 'q9', text: 'How does the pain affect dressing yourself?', options: ['No difficulty', 'Mild difficulty', 'Moderate difficulty', 'Requires assistance'] },
    { id: 'q10', text: 'Was the pain caused by a specific injury?', options: ['No injury', 'Gradual onset', 'Specific incident', 'Sports injury'] },
    { id: 'q11', text: 'Have you had previous shoulder surgery?', options: ['No', 'Yes, 1 time', 'Yes, 2 times', 'Yes, multiple'] },
    { id: 'q12', text: 'Do you experience numbness in your arm or hand?', options: ['No', 'Occasionally', 'Frequently', 'Constantly'] },
    { id: 'q13', text: 'Are you currently taking medication for this shoulder?', options: ['No', 'OTC occasionally', 'OTC regularly', 'Prescription required'] },
    { id: 'q14', text: 'How long have you had this shoulder problem?', options: ['Less than 1 week', '1-4 weeks', '1-6 months', 'Over 6 months'] },
    { id: 'q15', text: 'Does the shoulder feel unstable (like it might dislocate)?', options: ['No', 'Rarely', 'Sometimes', 'Frequently'] },
    { id: 'q16', text: 'Have you had physiotherapy for this shoulder?', options: ['Never', 'Once', 'Multiple times', 'Currently undergoing'] },
    { id: 'q17', text: 'How is your work affected?', options: ['Not affected', 'Mild limitation', 'Moderate limitation', 'Cannot work'] },
    { id: 'q18', text: 'Do you participate in sports?', options: ['No sports', 'Light activity', 'Regular sport', 'Competitive sport'] },
    { id: 'q19', text: 'Do you have any diagnosed conditions (e.g., diabetes, arthritis)?', options: ['None', 'Arthritis', 'Diabetes', 'Multiple'] },
    { id: 'q20', text: 'How is your overall quality of life affected?', options: ['Not affected', 'Slightly', 'Moderately', 'Severely'] }
  ],
  Spine: [
    { id: 'q1', text: 'How would you rate your back/neck pain at rest?', options: ['No pain', 'Mild', 'Moderate', 'Severe'] },
    { id: 'q2', text: 'How would you rate your back/neck pain during activity?', options: ['No pain', 'Mild', 'Moderate', 'Severe'] },
    { id: 'q3', text: 'Do you experience pain radiating down your leg or arm?', options: ['No radiation', 'Occasional', 'Frequent', 'Constant'] },
    { id: 'q4', text: 'Do you experience numbness or tingling in your limbs?', options: ['No', 'Occasionally', 'Frequently', 'Constantly'] },
    { id: 'q5', text: 'Can you bend forward comfortably?', options: ['Yes, fully', 'Partially', 'Only slightly', 'Cannot bend'] },
    { id: 'q6', text: 'Do you experience muscle weakness in your arms or legs?', options: ['No weakness', 'Mild', 'Moderate', 'Significant'] },
    { id: 'q7', text: 'Do you experience night pain?', options: ['No', 'Occasionally', 'Frequently', 'Every night'] },
    { id: 'q8', text: 'How long can you sit comfortably?', options: ['Over 1 hour', '30-60 min', '10-30 min', 'Less than 10 min'] },
    { id: 'q9', text: 'How long can you stand comfortably?', options: ['Over 1 hour', '30-60 min', '10-30 min', 'Less than 10 min'] },
    { id: 'q10', text: 'Was the onset related to an injury?', options: ['No injury', 'Lifting injury', 'Trauma', 'Accident'] },
    { id: 'q11', text: 'Have you had previous spine surgery?', options: ['No', 'Yes, 1 time', 'Yes, 2 times', 'Yes, multiple'] },
    { id: 'q12', text: 'Do you have any bowel or bladder issues?', options: ['None', 'Occasional urgency', 'Frequent issues', 'Loss of control'] },
    { id: 'q13', text: 'Are you currently taking pain medication?', options: ['No', 'OTC occasionally', 'OTC regularly', 'Prescription required'] },
    { id: 'q14', text: 'How long have you had this spine problem?', options: ['Less than 1 week', '1-4 weeks', '1-6 months', 'Over 6 months'] },
    { id: 'q15', text: 'Does the pain worsen when coughing or sneezing?', options: ['No', 'Rarely', 'Sometimes', 'Always'] },
    { id: 'q16', text: 'Have you had physiotherapy for this condition?', options: ['Never', 'Once', 'Multiple times', 'Currently undergoing'] },
    { id: 'q17', text: 'How is your work affected?', options: ['Not affected', 'Mild limitation', 'Moderate limitation', 'Cannot work'] },
    { id: 'q18', text: 'Do you have diagnosed conditions (e.g., diabetes, osteoporosis)?', options: ['None', 'Osteoporosis', 'Diabetes', 'Multiple'] },
    { id: 'q19', text: 'Do you experience stiffness in the morning?', options: ['No', 'Less than 30 min', '30-60 min', 'Over 1 hour'] },
    { id: 'q20', text: 'How is your overall quality of life affected?', options: ['Not affected', 'Slightly', 'Moderately', 'Severely'] }
  ],
  Other: [
    { id: 'q1', text: 'How would you rate your pain at rest?', options: ['No pain', 'Mild', 'Moderate', 'Severe'] },
    { id: 'q2', text: 'How would you rate your pain during activity?', options: ['No pain', 'Mild', 'Moderate', 'Severe'] },
    { id: 'q3', text: 'How does the pain affect your daily activities?', options: ['No impact', 'Mild impact', 'Moderate impact', 'Cannot perform'] },
    { id: 'q4', text: 'Do you experience swelling in the affected area?', options: ['No swelling', 'Occasional', 'Frequent', 'Constant'] },
    { id: 'q5', text: 'When did the problem start?', options: ['Less than 1 week', '1-4 weeks', '1-6 months', 'Over 6 months'] },
    { id: 'q6', text: 'Was the onset related to an injury?', options: ['No', 'Minor injury', 'Significant trauma', 'Gradual onset'] },
    { id: 'q7', text: 'Have you had this issue before?', options: ['No', 'Once before', 'Multiple times', 'Recurring condition'] },
    { id: 'q8', text: 'Are you currently taking pain medication?', options: ['No', 'OTC occasionally', 'OTC regularly', 'Prescription required'] },
    { id: 'q9', text: 'Have you had previous surgery for this condition?', options: ['No', 'Yes, once', 'Yes, multiple', 'Scheduled surgery'] },
    { id: 'q10', text: 'Do you experience night pain?', options: ['No', 'Occasionally', 'Frequently', 'Every night'] },
    { id: 'q11', text: 'Do you use a walking aid or support?', options: ['No', 'Occasionally', 'Most of the time', 'Always'] },
    { id: 'q12', text: 'Have you had physiotherapy before?', options: ['Never', 'Once', 'Multiple times', 'Currently undergoing'] },
    { id: 'q13', text: 'How is your work affected?', options: ['Not affected', 'Mild limitation', 'Moderate limitation', 'Cannot work'] },
    { id: 'q14', text: 'Do you have numbness or tingling?', options: ['No', 'Occasionally', 'Frequently', 'Constantly'] },
    { id: 'q15', text: 'Do you have any diagnosed conditions?', options: ['None', 'Arthritis', 'Diabetes', 'Multiple conditions'] },
    { id: 'q16', text: 'How is your overall quality of life affected?', options: ['Not affected', 'Slightly', 'Moderately', 'Severely'] },
    { id: 'q17', text: 'Do you experience stiffness in the morning?', options: ['No stiffness', 'Less than 30 min', '30-60 min', 'Over 1 hour'] },
    { id: 'q18', text: 'Does weather affect your pain?', options: ['No', 'Sometimes', 'Often', 'Always'] },
    { id: 'q19', text: 'Do you have pain when pressing on the affected area?', options: ['No', 'Mild tenderness', 'Moderate tenderness', 'Severe tenderness'] },
    { id: 'q20', text: 'What is your activity level?', options: ['Sedentary', 'Light activity', 'Moderate activity', 'Heavy work/sport'] }
  ]
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
