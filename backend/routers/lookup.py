from fastapi import APIRouter
from schemas import AssessmentQuestions, Question

router = APIRouter(prefix="/api", tags=["Lookup Data"])

ASSESSMENT_QUESTIONS = {
    "Knee": [
        {"id": "q1", "text": "How would you rate your knee pain at rest?", "options": ["No pain", "Mild pain", "Moderate pain", "Severe pain"]},
        {"id": "q2", "text": "How would you rate your knee pain during activity?", "options": ["No pain", "Mild pain", "Moderate pain", "Severe pain"]},
        {"id": "q3", "text": "Can you fully bend your knee?", "options": ["Yes, fully", "Mostly but limited", "Only slightly", "Cannot bend"]},
        {"id": "q4", "text": "Can you fully straighten your knee?", "options": ["Yes, fully", "Mostly but limited", "Only slightly", "Cannot straighten"]},
        {"id": "q5", "text": "Do you experience swelling in the knee?", "options": ["No swelling", "Occasional", "Frequent", "Constant"]},
        {"id": "q6", "text": "Do you experience locking or catching in the knee?", "options": ["Never", "Rarely", "Sometimes", "Often"]},
        {"id": "q7", "text": "How far can you walk without significant pain?", "options": ["More than 1 km", "500m - 1 km", "100m - 500m", "Less than 100m"]},
        {"id": "q8", "text": "Can you climb stairs?", "options": ["Yes, normally", "With mild difficulty", "With significant difficulty", "Cannot climb"]},
        {"id": "q9", "text": "Do you use a walking aid?", "options": ["None needed", "Occasionally", "Most of the time", "Always required"]},
        {"id": "q10", "text": "Has the knee given way (buckled) during activity?", "options": ["Never", "Rarely", "Sometimes", "Frequently"]},
        {"id": "q11", "text": "Do you experience night pain affecting sleep?", "options": ["No night pain", "Occasional", "Frequent", "Every night"]},
        {"id": "q12", "text": "Have you had previous knee surgery?", "options": ["No", "Yes, 1 surgery", "Yes, 2 surgeries", "Yes, 3 or more"]},
        {"id": "q13", "text": "Are you currently taking pain medication for this knee?", "options": ["No medication", "OTC occasionally", "OTC regularly", "Prescription required"]},
        {"id": "q14", "text": "How does the pain affect your daily activities?", "options": ["No impact", "Mild impact", "Moderate impact", "Cannot perform daily activities"]},
        {"id": "q15", "text": "When did the pain start?", "options": ["Less than 1 week", "1-4 weeks", "1-6 months", "More than 6 months"]},
        {"id": "q16", "text": "Was the onset of pain related to an injury?", "options": ["No injury", "Mild injury", "Significant trauma", "Sports injury"]},
        {"id": "q17", "text": "Do you have any diagnosed conditions (e.g., arthritis, diabetes)?", "options": ["None", "Arthritis", "Diabetes", "Multiple conditions"]},
        {"id": "q18", "text": "Have you had physical therapy for this knee before?", "options": ["Never", "Once", "Multiple times", "Currently undergoing PT"]},
        {"id": "q19", "text": "How is your overall quality of life affected?", "options": ["Not affected", "Slightly affected", "Moderately affected", "Severely affected"]},
        {"id": "q20", "text": "What is your work/activity level?", "options": ["Sedentary", "Light activity", "Moderate activity", "Heavy physical work"]},
    ],
    "Shoulder": [
        {"id": "q1", "text": "How would you rate your shoulder pain at rest?", "options": ["No pain", "Mild", "Moderate", "Severe"]},
        {"id": "q2", "text": "How would you rate your shoulder pain during movement?", "options": ["No pain", "Mild", "Moderate", "Severe"]},
        {"id": "q3", "text": "Can you raise your arm above shoulder height?", "options": ["Yes, fully", "Partially", "Only with pain", "Cannot raise"]},
        {"id": "q4", "text": "Can you reach behind your back?", "options": ["Yes, fully", "Partially", "Only with pain", "Cannot reach"]},
        {"id": "q5", "text": "Do you experience shoulder weakness?", "options": ["No weakness", "Mild weakness", "Moderate weakness", "Significant weakness"]},
        {"id": "q6", "text": "Do you experience clicking or popping in the shoulder?", "options": ["Never", "Rarely", "Sometimes", "Always"]},
        {"id": "q7", "text": "Do you have night pain affecting sleep?", "options": ["No", "Occasionally", "Frequently", "Every night"]},
        {"id": "q8", "text": "Can you perform overhead activities?", "options": ["Yes, normally", "With mild difficulty", "With great difficulty", "Cannot perform"]},
        {"id": "q9", "text": "How does the pain affect dressing yourself?", "options": ["No difficulty", "Mild difficulty", "Moderate difficulty", "Requires assistance"]},
        {"id": "q10", "text": "Was the pain caused by a specific injury?", "options": ["No injury", "Gradual onset", "Specific incident", "Sports injury"]},
        {"id": "q11", "text": "Have you had previous shoulder surgery?", "options": ["No", "Yes, 1 time", "Yes, 2 times", "Yes, multiple"]},
        {"id": "q12", "text": "Do you experience numbness in your arm or hand?", "options": ["No", "Occasionally", "Frequently", "Constantly"]},
        {"id": "q13", "text": "Are you currently taking medication for this shoulder?", "options": ["No", "OTC occasionally", "OTC regularly", "Prescription required"]},
        {"id": "q14", "text": "How long have you had this shoulder problem?", "options": ["Less than 1 week", "1-4 weeks", "1-6 months", "Over 6 months"]},
        {"id": "q15", "text": "Does the shoulder feel unstable (like it might dislocate)?", "options": ["No", "Rarely", "Sometimes", "Frequently"]},
        {"id": "q16", "text": "Have you had physiotherapy for this shoulder?", "options": ["Never", "Once", "Multiple times", "Currently undergoing"]},
        {"id": "q17", "text": "How is your work affected?", "options": ["Not affected", "Mild limitation", "Moderate limitation", "Cannot work"]},
        {"id": "q18", "text": "Do you participate in sports?", "options": ["No sports", "Light activity", "Regular sport", "Competitive sport"]},
        {"id": "q19", "text": "Do you have any diagnosed conditions (e.g., diabetes, arthritis)?", "options": ["None", "Arthritis", "Diabetes", "Multiple"]},
        {"id": "q20", "text": "How is your overall quality of life affected?", "options": ["Not affected", "Slightly", "Moderately", "Severely"]},
    ],
    "Spine": [
        {"id": "q1", "text": "How would you rate your back/neck pain at rest?", "options": ["No pain", "Mild", "Moderate", "Severe"]},
        {"id": "q2", "text": "How would you rate your back/neck pain during activity?", "options": ["No pain", "Mild", "Moderate", "Severe"]},
        {"id": "q3", "text": "Do you experience pain radiating down your leg or arm?", "options": ["No radiation", "Occasional", "Frequent", "Constant"]},
        {"id": "q4", "text": "Do you experience numbness or tingling in your limbs?", "options": ["No", "Occasionally", "Frequently", "Constantly"]},
        {"id": "q5", "text": "Can you bend forward comfortably?", "options": ["Yes, fully", "Partially", "Only slightly", "Cannot bend"]},
        {"id": "q6", "text": "Do you experience muscle weakness in your arms or legs?", "options": ["No weakness", "Mild", "Moderate", "Significant"]},
        {"id": "q7", "text": "Do you experience night pain?", "options": ["No", "Occasionally", "Frequently", "Every night"]},
        {"id": "q8", "text": "How long can you sit comfortably?", "options": ["Over 1 hour", "30-60 min", "10-30 min", "Less than 10 min"]},
        {"id": "q9", "text": "How long can you stand comfortably?", "options": ["Over 1 hour", "30-60 min", "10-30 min", "Less than 10 min"]},
        {"id": "q10", "text": "Was the onset related to an injury?", "options": ["No injury", "Lifting injury", "Trauma", "Accident"]},
        {"id": "q11", "text": "Have you had previous spine surgery?", "options": ["No", "Yes, 1 time", "Yes, 2 times", "Yes, multiple"]},
        {"id": "q12", "text": "Do you have any bowel or bladder issues?", "options": ["None", "Occasional urgency", "Frequent issues", "Loss of control"]},
        {"id": "q13", "text": "Are you currently taking pain medication?", "options": ["No", "OTC occasionally", "OTC regularly", "Prescription required"]},
        {"id": "q14", "text": "How long have you had this spine problem?", "options": ["Less than 1 week", "1-4 weeks", "1-6 months", "Over 6 months"]},
        {"id": "q15", "text": "Does the pain worsen when coughing or sneezing?", "options": ["No", "Rarely", "Sometimes", "Always"]},
        {"id": "q16", "text": "Have you had physiotherapy for this condition?", "options": ["Never", "Once", "Multiple times", "Currently undergoing"]},
        {"id": "q17", "text": "How is your work affected?", "options": ["Not affected", "Mild limitation", "Moderate limitation", "Cannot work"]},
        {"id": "q18", "text": "Do you have diagnosed conditions (e.g., diabetes, osteoporosis)?", "options": ["None", "Osteoporosis", "Diabetes", "Multiple"]},
        {"id": "q19", "text": "Do you experience stiffness in the morning?", "options": ["No", "Less than 30 min", "30-60 min", "Over 1 hour"]},
        {"id": "q20", "text": "How is your overall quality of life affected?", "options": ["Not affected", "Slightly", "Moderately", "Severely"]},
    ],
    "Other": [
        {"id": "q1", "text": "How would you rate your pain at rest?", "options": ["No pain", "Mild", "Moderate", "Severe"]},
        {"id": "q2", "text": "How would you rate your pain during activity?", "options": ["No pain", "Mild", "Moderate", "Severe"]},
        {"id": "q3", "text": "How does the pain affect your daily activities?", "options": ["No impact", "Mild impact", "Moderate impact", "Cannot perform"]},
        {"id": "q4", "text": "Do you experience swelling in the affected area?", "options": ["No swelling", "Occasional", "Frequent", "Constant"]},
        {"id": "q5", "text": "When did the problem start?", "options": ["Less than 1 week", "1-4 weeks", "1-6 months", "Over 6 months"]},
        {"id": "q6", "text": "Was the onset related to an injury?", "options": ["No", "Minor injury", "Significant trauma", "Gradual onset"]},
        {"id": "q7", "text": "Have you had this issue before?", "options": ["No", "Once before", "Multiple times", "Recurring condition"]},
        {"id": "q8", "text": "Are you currently taking pain medication?", "options": ["No", "OTC occasionally", "OTC regularly", "Prescription required"]},
        {"id": "q9", "text": "Have you had previous surgery for this condition?", "options": ["No", "Yes, once", "Yes, multiple", "Scheduled surgery"]},
        {"id": "q10", "text": "Do you experience night pain?", "options": ["No", "Occasionally", "Frequently", "Every night"]},
        {"id": "q11", "text": "Do you use a walking aid or support?", "options": ["No", "Occasionally", "Most of the time", "Always"]},
        {"id": "q12", "text": "Have you had physiotherapy before?", "options": ["Never", "Once", "Multiple times", "Currently undergoing"]},
        {"id": "q13", "text": "How is your work affected?", "options": ["Not affected", "Mild limitation", "Moderate limitation", "Cannot work"]},
        {"id": "q14", "text": "Do you have numbness or tingling?", "options": ["No", "Occasionally", "Frequently", "Constantly"]},
        {"id": "q15", "text": "Do you have any diagnosed conditions?", "options": ["None", "Arthritis", "Diabetes", "Multiple conditions"]},
        {"id": "q16", "text": "How is your overall quality of life affected?", "options": ["Not affected", "Slightly", "Moderately", "Severely"]},
        {"id": "q17", "text": "Do you experience stiffness in the morning?", "options": ["No stiffness", "Less than 30 min", "30-60 min", "Over 1 hour"]},
        {"id": "q18", "text": "Does weather affect your pain?", "options": ["No", "Sometimes", "Often", "Always"]},
        {"id": "q19", "text": "Do you have pain when pressing on the affected area?", "options": ["No", "Mild tenderness", "Moderate tenderness", "Severe tenderness"]},
        {"id": "q20", "text": "What is your activity level?", "options": ["Sedentary", "Light activity", "Moderate activity", "Heavy work/sport"]},
    ],
}

BODY_AREAS = ["Knee", "Shoulder", "Spine", "Other"]

STATUS_CONFIG = {
    "pending": {"label": "Pending Call", "class": "badge-pending", "color": "#a16207"},
    "assessment-completed": {"label": "Assessment Completed", "class": "badge-active", "color": "#166534"},
    "follow-up": {"label": "Follow-Up Required", "class": "badge-followup", "color": "#5b21b6"},
    "completed": {"label": "Completed", "class": "badge-completed", "color": "#0369a1"},
}

DIAGNOSTIC_TESTS = [
    {"id": "xray", "name": "X-Ray", "icon": "\U0001f9b4", "desc": "Bone structure & fractures"},
    {"id": "mri", "name": "MRI", "icon": "\U0001f9f2", "desc": "Soft tissue, ligaments & discs"},
    {"id": "ct", "name": "CT Scan", "icon": "\U0001f52c", "desc": "Cross-sectional bone imaging"},
    {"id": "lab", "name": "Laboratory Tests", "icon": "\U0001f9ea", "desc": "Blood work & inflammatory markers"},
    {"id": "us", "name": "Ultrasound", "icon": "\U0001f4e1", "desc": "Real-time soft tissue imaging"},
]

TREATMENT_OPTIONS = [
    {"id": "surgery", "name": "Surgery", "icon": "\U0001f52a", "desc": "Surgical intervention for structural repair"},
    {"id": "medication", "name": "Medication", "icon": "\U0001f48a", "desc": "Pharmacological pain and inflammation management"},
    {"id": "physio", "name": "Physiotherapy", "icon": "\U0001f3c3", "desc": "Structured rehabilitation and exercise program"},
    {"id": "injection", "name": "Injection Therapy", "icon": "\U0001f489", "desc": "Corticosteroid or PRP injections"},
    {"id": "rest", "name": "Rest & Monitoring", "icon": "\U0001f6cc", "desc": "Conservative management with follow-up"},
    {"id": "rehab", "name": "Long-term Rehab", "icon": "\u267b\ufe0f", "desc": "Extended rehabilitation program"},
]


@router.get("/questions", response_model=dict)
def get_questions(body_area: str = "Knee"):
    questions = ASSESSMENT_QUESTIONS.get(body_area, ASSESSMENT_QUESTIONS["Other"])
    return {"questions": questions}


@router.get("/body-areas")
def get_body_areas():
    return {"bodyAreas": BODY_AREAS}


@router.get("/status-config")
def get_status_config():
    return {"statusConfig": STATUS_CONFIG}


@router.get("/diagnostic-tests")
def get_diagnostic_tests():
    return {"diagnosticTests": DIAGNOSTIC_TESTS}


@router.get("/treatment-options")
def get_treatment_options():
    return {"treatmentOptions": TREATMENT_OPTIONS}
