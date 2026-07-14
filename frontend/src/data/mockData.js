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

// ─── Rich Assessment Config ───────────────────────────────────────────────────
export const ASSESSMENT_CONFIG = {
  Knee: {
    id: 'knee-intake',
    title: 'PROM Intake — Knee',
    description: 'Please answer all questions honestly. Your responses help us provide the best possible care.',
    sections: [
      {
        id: 'demographics',
        title: 'Demographics',
        icon: 'User',
        questions: [
          {
            id: 'dem_onset', type: 'radio', required: true,
            text: 'When did your knee pain start?',
            description: 'Select the option that best describes when your symptoms began.',
            options: ['Less than 1 week', '1–4 weeks', '1–6 months', 'More than 6 months']
          },
          {
            id: 'dem_surgery', type: 'radio', required: true,
            text: 'Have you had previous knee surgery?',
            options: ['No', 'Yes — 1 surgery', 'Yes — 2 surgeries', 'Yes — 3 or more']
          },
          {
            id: 'dem_injury', type: 'radio', required: true,
            text: 'Was the onset of pain related to an injury?',
            options: ['No injury', 'Mild injury', 'Significant trauma', 'Sports injury']
          },
          {
            id: 'dem_occupation', type: 'text', required: false,
            text: 'What is your current occupation?',
            description: 'Optional — helps us understand your activity requirements.',
            placeholder: 'e.g. Teacher, Construction worker, Office worker'
          },
          {
            id: 'dem_activity', type: 'radio', required: true,
            text: 'How would you describe your typical activity level?',
            options: ['Sedentary (mostly sitting)', 'Light activity', 'Moderate activity', 'Heavy physical work / sport']
          }
        ]
      },
      {
        id: 'symptoms',
        title: 'Symptoms',
        icon: 'Activity',
        questions: [
          {
            id: 'sym_swelling', type: 'radio', required: true,
            text: 'Do you experience swelling in the knee?',
            options: ['No swelling', 'Occasional swelling', 'Frequent swelling', 'Constant swelling']
          },
          {
            id: 'sym_locking', type: 'radio', required: true,
            text: 'Do you experience locking or catching in the knee?',
            description: 'Locking means the knee gets stuck and cannot fully straighten.',
            options: ['Never', 'Rarely', 'Sometimes', 'Often']
          },
          {
            id: 'sym_buckling', type: 'radio', required: true,
            text: 'Has the knee given way (buckled) during activity?',
            options: ['Never', 'Rarely', 'Sometimes', 'Frequently']
          },
          {
            id: 'sym_stiffness', type: 'radio', required: true,
            text: 'Do you experience morning stiffness?',
            options: ['No stiffness', 'Less than 30 minutes', '30–60 minutes', 'More than 1 hour']
          },
          {
            id: 'sym_description', type: 'textarea', required: false,
            text: 'Describe any other symptoms you are experiencing.',
            placeholder: 'e.g. Clicking sounds, warmth, redness, numbness…',
            description: 'Any additional details will help your doctor.'
          }
        ]
      },
      {
        id: 'pain',
        title: 'Pain Assessment',
        icon: 'Zap',
        scoring: true,
        questions: [
          {
            id: 'pain_rest', type: 'radio', required: true,
            text: 'How would you rate your knee pain at rest?',
            description: 'Consider pain when sitting, lying down, or relaxing.',
            options: ['No pain', 'Mild pain', 'Moderate pain', 'Severe pain'],
            scoreValues: [0, 1, 2, 3]
          },
          {
            id: 'pain_activity', type: 'radio', required: true,
            text: 'How would you rate your knee pain during activity?',
            description: 'Consider pain when walking, climbing stairs, or exercising.',
            options: ['No pain', 'Mild pain', 'Moderate pain', 'Severe pain'],
            scoreValues: [0, 1, 2, 3]
          },
          {
            id: 'pain_night', type: 'radio', required: true,
            text: 'Do you experience night pain that affects your sleep?',
            options: ['No night pain', 'Occasional', 'Frequent', 'Every night'],
            scoreValues: [0, 1, 2, 3]
          },
          {
            id: 'pain_scale', type: 'numeric', required: true,
            text: 'On a scale of 0–10, what is your average pain level this week?',
            description: '0 = No pain, 10 = Worst pain imaginable',
            min: 0, max: 10, step: 1,
            scoreValues: null
          },
          {
            id: 'pain_medication', type: 'radio', required: true,
            text: 'Are you currently taking pain medication for this knee?',
            options: ['No medication', 'Over-the-counter, occasionally', 'Over-the-counter, regularly', 'Prescription required'],
            scoreValues: [0, 1, 2, 3]
          }
        ]
      },
      {
        id: 'quickdash',
        title: 'QuickDASH',
        icon: 'BarChart2',
        scoring: true,
        scoreCalculation: 'quickdash',
        description: 'Please rate your ability to perform the following activities in the past week.',
        questions: [
          {
            id: 'qdash_bend', type: 'radio', required: true,
            text: 'Can you fully bend your knee?',
            options: ['No difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty', 'Unable to perform'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_straighten', type: 'radio', required: true,
            text: 'Can you fully straighten your knee?',
            options: ['No difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty', 'Unable to perform'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_walk', type: 'radio', required: true,
            text: 'How far can you walk without significant pain?',
            description: 'During the past week.',
            options: ['More than 1 km', '500 m – 1 km', '100 m – 500 m', 'Less than 100 m', 'Unable to walk'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_stairs', type: 'radio', required: true,
            text: 'Can you climb stairs?',
            options: ['No difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty', 'Unable to perform'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_sleep', type: 'radio', required: true,
            text: 'During the past week, how much difficulty have you had sleeping because of pain in your knee?',
            options: ['No difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty', 'Unable to perform'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_work', type: 'radio', required: true,
            text: 'During the past week, to what extent has your knee problem interfered with your work?',
            options: ['Not at all', 'Slightly', 'Moderately', 'Quite a bit', 'Extremely'],
            scoreValues: [1, 2, 3, 4, 5]
          }
        ]
      },
      {
        id: 'qol',
        title: 'Quality of Life',
        icon: 'Heart',
        questions: [
          {
            id: 'qol_daily', type: 'radio', required: true,
            text: 'How does the knee pain affect your daily activities?',
            options: ['No impact', 'Mild impact', 'Moderate impact', 'Cannot perform daily activities']
          },
          {
            id: 'qol_aid', type: 'radio', required: true,
            text: 'Do you use a walking aid?',
            options: ['None needed', 'Occasionally', 'Most of the time', 'Always required']
          },
          {
            id: 'qol_social', type: 'radio', required: true,
            text: 'How has your social life been affected by your knee problem?',
            options: ['Not affected', 'Slightly affected', 'Moderately affected', 'Severely affected']
          },
          {
            id: 'qol_overall', type: 'radio', required: true,
            text: 'Overall, how is your quality of life affected?',
            options: ['Not affected', 'Slightly affected', 'Moderately affected', 'Severely affected']
          },
          {
            id: 'qol_mood', type: 'radio', required: false,
            text: 'Has your knee problem affected your mood or mental well-being?',
            options: ['Not at all', 'Occasionally', 'Often', 'Significantly']
          }
        ]
      },
      {
        id: 'other',
        title: 'Other',
        icon: 'MoreHorizontal',
        questions: [
          {
            id: 'oth_conditions', type: 'checkbox', required: false,
            text: 'Do you have any of the following diagnosed conditions?',
            description: 'Select all that apply.',
            options: ['Osteoarthritis', 'Rheumatoid Arthritis', 'Diabetes', 'Osteoporosis', 'Heart disease', 'None of the above']
          },
          {
            id: 'oth_physio', type: 'radio', required: true,
            text: 'Have you had physical therapy for this knee before?',
            options: ['Never', 'Once', 'Multiple times', 'Currently undergoing PT']
          },
          {
            id: 'oth_injection', type: 'radio', required: false,
            text: 'Have you had any injections into the knee?',
            options: ['No', 'Cortisone injection(s)', 'Hyaluronic acid', 'PRP therapy']
          },
          {
            id: 'oth_notes', type: 'textarea', required: false,
            text: 'Is there anything else you would like the doctor to know?',
            placeholder: 'Any additional concerns, questions, or context…'
          }
        ]
      }
    ]
  },

  Shoulder: {
    id: 'shoulder-intake',
    title: 'PROM Intake — Shoulder',
    description: 'Please answer all questions honestly about your shoulder condition.',
    sections: [
      {
        id: 'demographics',
        title: 'Demographics',
        icon: 'User',
        questions: [
          {
            id: 'dem_onset', type: 'radio', required: true,
            text: 'How long have you had this shoulder problem?',
            options: ['Less than 1 week', '1–4 weeks', '1–6 months', 'Over 6 months']
          },
          {
            id: 'dem_surgery', type: 'radio', required: true,
            text: 'Have you had previous shoulder surgery?',
            options: ['No', 'Yes — once', 'Yes — twice', 'Yes — multiple times']
          },
          {
            id: 'dem_injury', type: 'radio', required: true,
            text: 'Was the pain caused by a specific injury?',
            options: ['No injury', 'Gradual onset', 'Specific incident', 'Sports injury']
          },
          {
            id: 'dem_dominant', type: 'radio', required: true,
            text: 'Which is your dominant hand?',
            options: ['Right', 'Left', 'Ambidextrous']
          },
          {
            id: 'dem_affected', type: 'radio', required: true,
            text: 'Which shoulder is affected?',
            options: ['Right only', 'Left only', 'Both shoulders']
          }
        ]
      },
      {
        id: 'symptoms',
        title: 'Symptoms',
        icon: 'Activity',
        questions: [
          {
            id: 'sym_raise', type: 'radio', required: true,
            text: 'Can you raise your arm above shoulder height?',
            options: ['Yes, fully', 'Partially', 'Only with pain', 'Cannot raise']
          },
          {
            id: 'sym_behind', type: 'radio', required: true,
            text: 'Can you reach behind your back?',
            options: ['Yes, fully', 'Partially', 'Only with pain', 'Cannot reach']
          },
          {
            id: 'sym_weakness', type: 'radio', required: true,
            text: 'Do you experience shoulder weakness?',
            options: ['No weakness', 'Mild weakness', 'Moderate weakness', 'Significant weakness']
          },
          {
            id: 'sym_clicking', type: 'radio', required: true,
            text: 'Do you experience clicking or popping in the shoulder?',
            options: ['Never', 'Rarely', 'Sometimes', 'Always']
          },
          {
            id: 'sym_numbness', type: 'radio', required: true,
            text: 'Do you experience numbness or tingling in your arm or hand?',
            options: ['No', 'Occasionally', 'Frequently', 'Constantly']
          }
        ]
      },
      {
        id: 'pain',
        title: 'Pain Assessment',
        icon: 'Zap',
        scoring: true,
        questions: [
          {
            id: 'pain_rest', type: 'radio', required: true,
            text: 'How would you rate your shoulder pain at rest?',
            options: ['No pain', 'Mild', 'Moderate', 'Severe'],
            scoreValues: [0, 1, 2, 3]
          },
          {
            id: 'pain_activity', type: 'radio', required: true,
            text: 'How would you rate your shoulder pain during movement?',
            options: ['No pain', 'Mild', 'Moderate', 'Severe'],
            scoreValues: [0, 1, 2, 3]
          },
          {
            id: 'pain_night', type: 'radio', required: true,
            text: 'Do you have night pain affecting sleep?',
            options: ['No', 'Occasionally', 'Frequently', 'Every night'],
            scoreValues: [0, 1, 2, 3]
          },
          {
            id: 'pain_scale', type: 'numeric', required: true,
            text: 'Rate your average pain level this week (0–10).',
            description: '0 = No pain, 10 = Worst pain imaginable',
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
        description: 'Rate your ability to perform the following activities in the past week.',
        questions: [
          {
            id: 'qdash_overhead', type: 'radio', required: true,
            text: 'Can you perform overhead activities (e.g. reaching a high shelf)?',
            options: ['No difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty', 'Unable to perform'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_dressing', type: 'radio', required: true,
            text: 'How much difficulty do you have dressing yourself?',
            options: ['No difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty', 'Unable to perform'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_carry', type: 'radio', required: true,
            text: 'Can you carry a heavy bag or object?',
            options: ['No difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty', 'Unable to perform'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_sleep', type: 'radio', required: true,
            text: 'How much difficulty have you had sleeping because of shoulder pain?',
            options: ['No difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty', 'Unable to perform'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_work', type: 'radio', required: true,
            text: 'To what extent has your shoulder problem interfered with your work?',
            options: ['Not at all', 'Slightly', 'Moderately', 'Quite a bit', 'Extremely'],
            scoreValues: [1, 2, 3, 4, 5]
          }
        ]
      },
      {
        id: 'qol',
        title: 'Quality of Life',
        icon: 'Heart',
        questions: [
          {
            id: 'qol_instability', type: 'radio', required: true,
            text: 'Does the shoulder feel unstable (like it might dislocate)?',
            options: ['No', 'Rarely', 'Sometimes', 'Frequently']
          },
          {
            id: 'qol_sport', type: 'radio', required: false,
            text: 'Do you participate in sports or recreational activities?',
            options: ['No sports', 'Light activity', 'Regular sport', 'Competitive sport']
          },
          {
            id: 'qol_overall', type: 'radio', required: true,
            text: 'How is your overall quality of life affected by this shoulder problem?',
            options: ['Not affected', 'Slightly', 'Moderately', 'Severely']
          }
        ]
      },
      {
        id: 'other',
        title: 'Other',
        icon: 'MoreHorizontal',
        questions: [
          {
            id: 'oth_conditions', type: 'checkbox', required: false,
            text: 'Do you have any of the following diagnosed conditions?',
            description: 'Select all that apply.',
            options: ['Diabetes', 'Rheumatoid Arthritis', 'Osteoporosis', 'Heart disease', 'None of the above']
          },
          {
            id: 'oth_physio', type: 'radio', required: true,
            text: 'Have you had physiotherapy for this shoulder?',
            options: ['Never', 'Once', 'Multiple times', 'Currently undergoing']
          },
          {
            id: 'oth_work', type: 'radio', required: true,
            text: 'How is your work affected?',
            options: ['Not affected', 'Mild limitation', 'Moderate limitation', 'Cannot work']
          },
          {
            id: 'oth_notes', type: 'textarea', required: false,
            text: 'Is there anything else you would like the doctor to know?',
            placeholder: 'Any additional concerns or context…'
          }
        ]
      }
    ]
  },

  Spine: {
    id: 'spine-intake',
    title: 'PROM Intake — Spine',
    description: 'Please answer all questions honestly about your back or neck condition.',
    sections: [
      {
        id: 'demographics',
        title: 'Demographics',
        icon: 'User',
        questions: [
          {
            id: 'dem_onset', type: 'radio', required: true,
            text: 'How long have you had this spine problem?',
            options: ['Less than 1 week', '1–4 weeks', '1–6 months', 'Over 6 months']
          },
          {
            id: 'dem_surgery', type: 'radio', required: true,
            text: 'Have you had previous spine surgery?',
            options: ['No', 'Yes — once', 'Yes — twice', 'Yes — multiple times']
          },
          {
            id: 'dem_injury', type: 'radio', required: true,
            text: 'Was the onset related to an injury?',
            options: ['No injury', 'Lifting injury', 'Trauma / accident', 'Gradual onset']
          },
          {
            id: 'dem_region', type: 'radio', required: true,
            text: 'Which region is primarily affected?',
            options: ['Lower back (lumbar)', 'Mid back (thoracic)', 'Neck (cervical)', 'Multiple regions']
          }
        ]
      },
      {
        id: 'symptoms',
        title: 'Symptoms',
        icon: 'Activity',
        questions: [
          {
            id: 'sym_radiation', type: 'radio', required: true,
            text: 'Do you experience pain radiating down your leg or arm?',
            options: ['No radiation', 'Occasional', 'Frequent', 'Constant']
          },
          {
            id: 'sym_numbness', type: 'radio', required: true,
            text: 'Do you experience numbness or tingling in your limbs?',
            options: ['No', 'Occasionally', 'Frequently', 'Constantly']
          },
          {
            id: 'sym_weakness', type: 'radio', required: true,
            text: 'Do you experience muscle weakness in your arms or legs?',
            options: ['No weakness', 'Mild', 'Moderate', 'Significant']
          },
          {
            id: 'sym_bladder', type: 'radio', required: true,
            text: 'Do you have any bowel or bladder issues?',
            description: 'Important for ruling out serious conditions.',
            options: ['None', 'Occasional urgency', 'Frequent issues', 'Loss of control']
          },
          {
            id: 'sym_cough', type: 'radio', required: false,
            text: 'Does the pain worsen when coughing or sneezing?',
            options: ['No', 'Rarely', 'Sometimes', 'Always']
          }
        ]
      },
      {
        id: 'pain',
        title: 'Pain Assessment',
        icon: 'Zap',
        scoring: true,
        questions: [
          {
            id: 'pain_rest', type: 'radio', required: true,
            text: 'How would you rate your back/neck pain at rest?',
            options: ['No pain', 'Mild', 'Moderate', 'Severe'],
            scoreValues: [0, 1, 2, 3]
          },
          {
            id: 'pain_activity', type: 'radio', required: true,
            text: 'How would you rate your pain during activity?',
            options: ['No pain', 'Mild', 'Moderate', 'Severe'],
            scoreValues: [0, 1, 2, 3]
          },
          {
            id: 'pain_night', type: 'radio', required: true,
            text: 'Do you experience night pain?',
            options: ['No', 'Occasionally', 'Frequently', 'Every night'],
            scoreValues: [0, 1, 2, 3]
          },
          {
            id: 'pain_scale', type: 'numeric', required: true,
            text: 'Rate your average pain level this week (0–10).',
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
        description: 'Rate your ability to perform the following activities in the past week.',
        questions: [
          {
            id: 'qdash_sit', type: 'radio', required: true,
            text: 'How long can you sit comfortably?',
            options: ['Over 1 hour', '30–60 minutes', '10–30 minutes', 'Less than 10 minutes', 'Cannot sit'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_stand', type: 'radio', required: true,
            text: 'How long can you stand comfortably?',
            options: ['Over 1 hour', '30–60 minutes', '10–30 minutes', 'Less than 10 minutes', 'Cannot stand'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_bend', type: 'radio', required: true,
            text: 'Can you bend forward comfortably?',
            options: ['No difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty', 'Cannot bend'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_sleep', type: 'radio', required: true,
            text: 'How much difficulty have you had sleeping because of spine pain?',
            options: ['No difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty', 'Unable to perform'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_work', type: 'radio', required: true,
            text: 'To what extent has your spine problem interfered with your work?',
            options: ['Not at all', 'Slightly', 'Moderately', 'Quite a bit', 'Extremely'],
            scoreValues: [1, 2, 3, 4, 5]
          }
        ]
      },
      {
        id: 'qol',
        title: 'Quality of Life',
        icon: 'Heart',
        questions: [
          {
            id: 'qol_morning', type: 'radio', required: true,
            text: 'Do you experience morning stiffness?',
            options: ['No', 'Less than 30 minutes', '30–60 minutes', 'Over 1 hour']
          },
          {
            id: 'qol_work', type: 'radio', required: true,
            text: 'How is your work affected?',
            options: ['Not affected', 'Mild limitation', 'Moderate limitation', 'Cannot work']
          },
          {
            id: 'qol_overall', type: 'radio', required: true,
            text: 'How is your overall quality of life affected?',
            options: ['Not affected', 'Slightly', 'Moderately', 'Severely']
          }
        ]
      },
      {
        id: 'other',
        title: 'Other',
        icon: 'MoreHorizontal',
        questions: [
          {
            id: 'oth_conditions', type: 'checkbox', required: false,
            text: 'Do you have any of the following diagnosed conditions?',
            description: 'Select all that apply.',
            options: ['Osteoporosis', 'Diabetes', 'Rheumatoid Arthritis', 'Heart disease', 'None of the above']
          },
          {
            id: 'oth_physio', type: 'radio', required: true,
            text: 'Have you had physiotherapy for this condition?',
            options: ['Never', 'Once', 'Multiple times', 'Currently undergoing']
          },
          {
            id: 'oth_notes', type: 'textarea', required: false,
            text: 'Is there anything else you would like the doctor to know?',
            placeholder: 'Any additional concerns or context…'
          }
        ]
      }
    ]
  },

  Other: {
    id: 'general-intake',
    title: 'PROM Intake — General',
    description: 'Please answer all questions honestly about your condition.',
    sections: [
      {
        id: 'demographics',
        title: 'Demographics',
        icon: 'User',
        questions: [
          {
            id: 'dem_onset', type: 'radio', required: true,
            text: 'When did the problem start?',
            options: ['Less than 1 week', '1–4 weeks', '1–6 months', 'Over 6 months']
          },
          {
            id: 'dem_injury', type: 'radio', required: true,
            text: 'Was the onset related to an injury?',
            options: ['No', 'Minor injury', 'Significant trauma', 'Gradual onset']
          },
          {
            id: 'dem_surgery', type: 'radio', required: true,
            text: 'Have you had previous surgery for this condition?',
            options: ['No', 'Yes — once', 'Yes — multiple times', 'Surgery scheduled']
          }
        ]
      },
      {
        id: 'symptoms',
        title: 'Symptoms',
        icon: 'Activity',
        questions: [
          {
            id: 'sym_swelling', type: 'radio', required: true,
            text: 'Do you experience swelling in the affected area?',
            options: ['No swelling', 'Occasional', 'Frequent', 'Constant']
          },
          {
            id: 'sym_numbness', type: 'radio', required: true,
            text: 'Do you have numbness or tingling?',
            options: ['No', 'Occasionally', 'Frequently', 'Constantly']
          },
          {
            id: 'sym_recurring', type: 'radio', required: true,
            text: 'Have you had this issue before?',
            options: ['No', 'Once before', 'Multiple times', 'Recurring condition']
          }
        ]
      },
      {
        id: 'pain',
        title: 'Pain Assessment',
        icon: 'Zap',
        scoring: true,
        questions: [
          {
            id: 'pain_rest', type: 'radio', required: true,
            text: 'How would you rate your pain at rest?',
            options: ['No pain', 'Mild', 'Moderate', 'Severe'],
            scoreValues: [0, 1, 2, 3]
          },
          {
            id: 'pain_activity', type: 'radio', required: true,
            text: 'How would you rate your pain during activity?',
            options: ['No pain', 'Mild', 'Moderate', 'Severe'],
            scoreValues: [0, 1, 2, 3]
          },
          {
            id: 'pain_night', type: 'radio', required: true,
            text: 'Do you experience night pain?',
            options: ['No', 'Occasionally', 'Frequently', 'Every night'],
            scoreValues: [0, 1, 2, 3]
          },
          {
            id: 'pain_scale', type: 'numeric', required: true,
            text: 'Rate your average pain level this week (0–10).',
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
        description: 'Rate your ability to perform the following activities in the past week.',
        questions: [
          {
            id: 'qdash_daily', type: 'radio', required: true,
            text: 'How does the pain affect your daily activities?',
            options: ['No impact', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty', 'Cannot perform'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_sleep', type: 'radio', required: true,
            text: 'How much difficulty have you had sleeping because of pain?',
            options: ['No difficulty', 'Mild difficulty', 'Moderate difficulty', 'Severe difficulty', 'Unable to perform'],
            scoreValues: [1, 2, 3, 4, 5]
          },
          {
            id: 'qdash_work', type: 'radio', required: true,
            text: 'To what extent has your problem interfered with your work?',
            options: ['Not at all', 'Slightly', 'Moderately', 'Quite a bit', 'Extremely'],
            scoreValues: [1, 2, 3, 4, 5]
          }
        ]
      },
      {
        id: 'qol',
        title: 'Quality of Life',
        icon: 'Heart',
        questions: [
          {
            id: 'qol_aid', type: 'radio', required: true,
            text: 'Do you use a walking aid or support?',
            options: ['No', 'Occasionally', 'Most of the time', 'Always']
          },
          {
            id: 'qol_overall', type: 'radio', required: true,
            text: 'How is your overall quality of life affected?',
            options: ['Not affected', 'Slightly', 'Moderately', 'Severely']
          }
        ]
      },
      {
        id: 'other',
        title: 'Other',
        icon: 'MoreHorizontal',
        questions: [
          {
            id: 'oth_conditions', type: 'checkbox', required: false,
            text: 'Do you have any of the following diagnosed conditions?',
            options: ['Arthritis', 'Diabetes', 'Osteoporosis', 'Heart disease', 'None of the above']
          },
          {
            id: 'oth_physio', type: 'radio', required: true,
            text: 'Have you had physiotherapy before?',
            options: ['Never', 'Once', 'Multiple times', 'Currently undergoing']
          },
          {
            id: 'oth_weather', type: 'radio', required: false,
            text: 'Does weather affect your pain?',
            options: ['No', 'Sometimes', 'Often', 'Always']
          },
          {
            id: 'oth_notes', type: 'textarea', required: false,
            text: 'Is there anything else you would like the doctor to know?',
            placeholder: 'Any additional concerns or context…'
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
