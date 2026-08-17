"""
Seeds all PROM instruments into `assessment_configs` using the EXACT questions
from the official PDFs in the scores/ directory:

  scores/KOOS.pdf                       → KOOS-JR (7 items, Saudi-Arabic)
  scores/hoos_hip_survey.pdf            → Full HOOS (40 items, 6 subscales)
  scores/wirsthand elbow shoulder.pdf   → DASH, 29 mandatory items (Shoulder/Elbow/Hand&Wrist) —
                                           item 21 "sexual activities" and the optional Work /
                                           Sports-Performing-Arts modules (PDF page 4) are excluded
                                           per the source PDF, which marks them optional
  scores/how_we_calc_for_all_and_distribution.jpg → scoring rules
  scores/Koos_how_to_calcuate_score.txt → KOOS-JR Rasch conversion table

Scoring formulas (from clinic guide image):
  KOOS-JR:   Raw 0-28 → official Rasch table → 0-100 (higher=better)
  HOOS full: 100 - (rawSum / (n*4)) * 100 → 0-100 (higher=better)
  DASH:      ((sum/n) - 1) × 25 → 0-100 (lower=better disability score); n = answered
             out of 29 mandatory items, min 26 required
  ODI/NDI:   (total / (answered×5)) × 100 → 0-100% (lower=better)
  SEFAS:     (raw / 48) × 100 → 0-100 (higher=better)

Safe to re-run: each bodyArea is deleted then re-inserted.
"""
import sys
import os

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(__file__))

from database import engine, SessionLocal, Base
from models import AssessmentConfig


# ─── Shared Helpers ──────────────────────────────────────────────────────────

def pain_item():
    """0-10 NRS pain scale — not counted in PROM instrument score."""
    return {
        "id": "pain_scale", "type": "numeric", "required": True,
        "text": "مستوى الألم الآن (0-10)  /  Current Pain Level (0–10)",
        "description": "0 = لا يوجد ألم (No pain) ← → 10 = أشد ألم يتخيله العقل (Worst imaginable)",
        "min": 0, "max": 10, "step": 1, "scoreValues": None,
    }


def radio(qid, text, options, score_values, required=True, description=None):
    q = {
        "id": qid, "type": "radio", "required": required,
        "text": text, "options": options, "scoreValues": score_values,
    }
    if description:
        q["description"] = description
    return q


def intake_section():
    return {"id": "intake", "title": "Pain Intake / تقييم شدة الألم", "questions": [pain_item()]}


# ═══════════════════════════════════════════════════════════════════════════════
# KOOS-JR — Knee  (7 items, scored 0-4 each, raw 0-28)
# Source: scores/KOOS.pdf  (Saudi-Arabic KOOS-JR)
# Scoring: official Rasch conversion table → 0-100 (higher = better function)
# ═══════════════════════════════════════════════════════════════════════════════

KOOS_JR_CONV = {
    0: 100.0, 1: 91.975, 2: 84.600, 3: 79.914, 4: 76.332,
    5: 73.342, 6: 70.704, 7: 68.284, 8: 65.994, 9: 63.776,
    10: 61.583, 11: 59.381, 12: 57.140, 13: 54.840, 14: 52.465,
    15: 50.012, 16: 47.487, 17: 44.905, 18: 42.281, 19: 39.625,
    20: 36.931, 21: 34.174, 22: 31.307, 23: 28.251, 24: 24.875,
    25: 21.084, 26: 16.930, 27: 11.883, 28: 0.0,
}

# From PDF: options appear in order None→Extreme (0=best, 4=worst)
KOOS_OPT = ["لا يوجد (None)", "خفيف (Mild)", "متوسط (Moderate)", "شديد (Severe)", "شديد جداً (Extreme)"]
KOOS_SV  = [0, 1, 2, 3, 4]   # raw higher = more problems → Rasch table inverts to 0-100


def koos_jr_questions():
    # Exact items from Saudi-Arabic KOOS.pdf
    return [
        radio("kj_S6",  "S6. كيف تكون شدة التصلب في ركبتك بعد الاستيقاظ صباحاً؟\n(How severe is your knee stiffness after first waking in the morning?)",
              KOOS_OPT, KOOS_SV),
        radio("kj_P2",  "P2. الإلتواء / اللف على ركبتك\n(Twisting / pivoting on your knee)",
              KOOS_OPT, KOOS_SV),
        radio("kj_P3",  "P3. مد الركبة بالكامل\n(Straightening your knee fully)",
              KOOS_OPT, KOOS_SV),
        radio("kj_P6",  "P6. صعود أو نزول الدرج\n(Going up or down stairs)",
              KOOS_OPT, KOOS_SV),
        radio("kj_P9",  "P9. الوقوف باستقامة\n(Standing upright)",
              KOOS_OPT, KOOS_SV),
        radio("kj_A3",  "A3. القيام من وضع الجلوس\n(Rising from sitting)",
              KOOS_OPT, KOOS_SV),
        radio("kj_A5",  "A5. الإنحناء لإلتقاط شيء من الأرض\n(Bending to floor / pick up an object)",
              KOOS_OPT, KOOS_SV),
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# HOOS Full — Hip  (40 items, 6 sections)
# Source: scores/hoos_hip_survey.pdf  (Full HOOS English)
# All items scored [4,3,2,1,0] (No problem=4, Extreme=0) → higher raw = better
# Scoring: (rawSum / rawMax) × 100 → 0-100 (higher = better function)
# rawMax = 40 × 4 = 160
# ═══════════════════════════════════════════════════════════════════════════════

HOOS_FREQ = ["Never", "Rarely", "Sometimes", "Often", "Always"]          # S1-S3, P1, Q1
HOOS_PAIN = ["None", "Mild", "Moderate", "Severe", "Extreme"]            # P2-P10
HOOS_DIFF = ["None", "Mild", "Moderate", "Severe", "Extreme"]            # A1-A17, SP1-SP4, Q4
HOOS_FREQ2 = ["Never", "Monthly", "Weekly", "Daily", "Always"]           # P1, Q1 frequency
HOOS_MODIFY = ["Not at all", "Mildly", "Moderately", "Severely", "Totally"]    # Q2
HOOS_CONF  = ["Not at all", "Mildly", "Moderately", "Severely", "Extremely"]   # Q3

# All score [4,3,2,1,0] — higher raw score = better function
HOOS_SV    = [4, 3, 2, 1, 0]


def hoos_sections():
    return [
        {
            "id": "hoos_symptoms",
            "title": "Symptoms / الأعراض",
            "questions": [
                radio("h_S1", "S1. Do you feel grinding, hear clicking or any other type of noise from your hip?",
                      HOOS_FREQ, HOOS_SV),
                radio("h_S2", "S2. Difficulties spreading legs wide apart",
                      HOOS_DIFF, HOOS_SV),
                radio("h_S3", "S3. Difficulties to stride out when walking",
                      HOOS_DIFF, HOOS_SV),
            ],
        },
        {
            "id": "hoos_stiffness",
            "title": "Stiffness / التيبس",
            "questions": [
                radio("h_S4", "S4. How severe is your hip joint stiffness after first wakening in the morning?",
                      HOOS_PAIN, HOOS_SV),
                radio("h_S5", "S5. How severe is your hip stiffness after sitting, lying or resting later in the day?",
                      HOOS_PAIN, HOOS_SV),
            ],
        },
        {
            "id": "hoos_pain",
            "title": "Pain / الألم",
            "questions": [
                radio("h_P1",  "P1. How often is your hip painful?",
                      HOOS_FREQ2, HOOS_SV),
                radio("h_P2",  "P2. What amount of pain have you experienced — Straightening your hip fully?",
                      HOOS_PAIN, HOOS_SV),
                radio("h_P3",  "P3. Bending your hip fully",
                      HOOS_PAIN, HOOS_SV),
                radio("h_P4",  "P4. Walking on a flat surface",
                      HOOS_PAIN, HOOS_SV),
                radio("h_P5",  "P5. Going up or down stairs",
                      HOOS_PAIN, HOOS_SV),
                radio("h_P6",  "P6. At night while in bed",
                      HOOS_PAIN, HOOS_SV),
                radio("h_P7",  "P7. Sitting or lying",
                      HOOS_PAIN, HOOS_SV),
                radio("h_P8",  "P8. Standing upright",
                      HOOS_PAIN, HOOS_SV),
                radio("h_P9",  "P9. Walking on a hard surface (asphalt, concrete, etc.)",
                      HOOS_PAIN, HOOS_SV),
                radio("h_P10", "P10. Walking on an uneven surface",
                      HOOS_PAIN, HOOS_SV),
            ],
        },
        {
            "id": "hoos_adl",
            "title": "Function, Daily Living / الأنشطة اليومية",
            "questions": [
                radio("h_A1",  "A1. Descending stairs",        HOOS_DIFF, HOOS_SV),
                radio("h_A2",  "A2. Ascending stairs",         HOOS_DIFF, HOOS_SV),
                radio("h_A3",  "A3. Rising from sitting",      HOOS_DIFF, HOOS_SV),
                radio("h_A4",  "A4. Standing",                 HOOS_DIFF, HOOS_SV),
                radio("h_A5",  "A5. Bending to floor / pick up an object", HOOS_DIFF, HOOS_SV),
                radio("h_A6",  "A6. Walking on flat surface",  HOOS_DIFF, HOOS_SV),
                radio("h_A7",  "A7. Getting in / out of car",  HOOS_DIFF, HOOS_SV),
                radio("h_A8",  "A8. Going shopping",           HOOS_DIFF, HOOS_SV),
                radio("h_A9",  "A9. Putting on socks / stockings", HOOS_DIFF, HOOS_SV),
                radio("h_A10", "A10. Rising from bed",         HOOS_DIFF, HOOS_SV),
                radio("h_A11", "A11. Taking off socks / stockings", HOOS_DIFF, HOOS_SV),
                radio("h_A12", "A12. Lying in bed (turning over, maintaining hip position)", HOOS_DIFF, HOOS_SV),
                radio("h_A13", "A13. Getting in / out of bath", HOOS_DIFF, HOOS_SV),
                radio("h_A14", "A14. Sitting",                 HOOS_DIFF, HOOS_SV),
                radio("h_A15", "A15. Getting on / off toilet", HOOS_DIFF, HOOS_SV),
                radio("h_A16", "A16. Heavy domestic duties (moving heavy boxes, scrubbing floors, etc.)", HOOS_DIFF, HOOS_SV),
                radio("h_A17", "A17. Light domestic duties (cooking, dusting, etc.)", HOOS_DIFF, HOOS_SV),
            ],
        },
        {
            "id": "hoos_sport",
            "title": "Sport & Recreation / الرياضة والترفيه",
            "questions": [
                radio("h_SP1", "SP1. Squatting",                           HOOS_DIFF, HOOS_SV),
                radio("h_SP2", "SP2. Running",                             HOOS_DIFF, HOOS_SV),
                radio("h_SP3", "SP3. Twisting / pivoting on your injured hip", HOOS_DIFF, HOOS_SV),
                radio("h_SP4", "SP4. Walking on uneven surface",           HOOS_DIFF, HOOS_SV),
            ],
        },
        {
            "id": "hoos_qol",
            "title": "Quality of Life / جودة الحياة",
            "questions": [
                radio("h_Q1", "Q1. How often are you aware of your hip problem?",
                      HOOS_FREQ2, HOOS_SV),
                radio("h_Q2", "Q2. Have you modified your life style to avoid potentially damaging activities to your hip?",
                      HOOS_MODIFY, HOOS_SV),
                radio("h_Q3", "Q3. How much are you troubled with lack of confidence in your hip?",
                      HOOS_CONF, HOOS_SV),
                radio("h_Q4", "Q4. In general, how much difficulty do you have with your hip?",
                      HOOS_PAIN, HOOS_SV),
            ],
        },
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# DASH Full (30 items) — Shoulder / Elbow / Hand & Wrist
# Source: scores/wirsthand elbow shoulder.pdf  (Arabic DASH, 30-item main module)
# Scored 1-5 per item (1=No difficulty / No symptoms → 5=Unable / Extreme)
# Formula: ((sum / n) − 1) × 25  →  0–100  (0=no disability, 100=maximum)
# Minimum: 27 of 30 items must be completed.
# ═══════════════════════════════════════════════════════════════════════════════

DASH_DIFF  = ["بلا صعوبة (No Difficulty)", "بصعوبة خفيفة (Mild Difficulty)",
              "بصعوبة متوسطة (Moderate Difficulty)", "بصعوبة شديدة (Severe Difficulty)",
              "غير قادر (Unable)"]
DASH_IMPACT = ["أبداً لا / لا على الإطلاق (Not at all)", "بشكل طفيف (Slightly)",
               "بشكل متوسط (Moderately)", "كثيراً (Quite a bit)", "بشكل بالغ للغاية (Extremely)"]
DASH_LIMIT  = ["غير محدود على الإطلاق (Not limited at all)", "محدود بشكل طفيف (Slightly limited)",
               "محدود بشكل متوسط (Moderately limited)", "محدود جداً (Very limited)",
               "غير قادر (Unable)"]
DASH_PAIN   = ["لا يوجد (None)", "قليلاً (Mild)", "بشكل متوسط (Moderate)",
               "بشدة (Severe)", "بشدة بالغة (Extreme)"]
DASH_SLEEP  = ["لا صعوبة (No difficulty)", "صعوبة خفيفة (Mild difficulty)",
               "صعوبة متوسطة (Moderate difficulty)", "صعوبة شديدة (Severe difficulty)",
               "بحيث لا أقدر على النوم (So much I can't sleep)"]
DASH_AGREE  = ["لا أوافق بشدة (Strongly Disagree)", "لا أوافق (Disagree)",
               "لست موافقاً ولا معترضاً (Neither)", "أوافق (Agree)",
               "أوافق بشدة (Strongly Agree)"]

DASH_SV = [1, 2, 3, 4, 5]   # 1=best, 5=worst; formula uses raw sum directly


def dash_questions():
    # Exact 30 items from Arabic DASH PDF (pages 1–3)
    return [
        # ── Activities (items 1–21) ──
        radio("d_1",  "1. أن تفتح علبة جديدة أو محكمة الإغلاق\n   (Open a tight or new jar)",
              DASH_DIFF, DASH_SV),
        radio("d_2",  "2. أن تكتب\n   (Write)",
              DASH_DIFF, DASH_SV),
        radio("d_3",  "3. أن تدير / تبرم مفتاحاً (مثل تشغيل مفتاح السيارة)\n   (Turn a key, e.g. car ignition)",
              DASH_DIFF, DASH_SV),
        radio("d_4",  "4. أن تحضّر / تعدّ وجبة طعام\n   (Prepare a meal)",
              DASH_DIFF, DASH_SV),
        radio("d_5",  "5. أن تدفع لتفتح باباً ثقيلاً\n   (Push open a heavy door)",
              DASH_DIFF, DASH_SV),
        radio("d_6",  "6. أن تضع شيئاً على رف فوق مستوى رأسك\n   (Place an object on a shelf above your head)",
              DASH_DIFF, DASH_SV),
        radio("d_7",  "7. أن تقوم بأعمال المنزل الثقيلة (مثل غسل الحيطان أو إزاحة الأثاث)\n   (Do heavy household chores, e.g. wash walls, move furniture)",
              DASH_DIFF, DASH_SV),
        radio("d_8",  "8. أن تعمل في الحديقة أو فناء الدار\n   (Garden or do yard work)",
              DASH_DIFF, DASH_SV),
        radio("d_9",  "9. أن ترتب السرير\n   (Make a bed)",
              DASH_DIFF, DASH_SV),
        radio("d_10", "10. أن تحمل كيس التسوق أو حقيبة الوثائق\n   (Carry a shopping bag or briefcase)",
               DASH_DIFF, DASH_SV),
        radio("d_11", "11. أن تحمل غرضاً ثقيلاً (يزيد وزنه عن 10 أرطال / 4.5 كيلوغرام)\n   (Carry a heavy object, more than 10 lbs / 4.5 kg)",
               DASH_DIFF, DASH_SV),
        radio("d_12", "12. أن تغيّر لمبة المصباح من فوق رأسك\n   (Change a lightbulb overhead)",
               DASH_DIFF, DASH_SV),
        radio("d_13", "13. أن تغسل شعرك أو تنشفه بالمجفف الهوائي\n   (Wash or blow-dry your hair)",
               DASH_DIFF, DASH_SV),
        radio("d_14", "14. أن تغسل ظهرك\n   (Wash your back)",
               DASH_DIFF, DASH_SV),
        radio("d_15", "15. أن تلبس كنزة / ثوب / بلوزة ذات أكمام طويلة\n   (Put on a sweater / pullover)",
               DASH_DIFF, DASH_SV),
        radio("d_16", "16. أن تستخدم سكيناً لتقطيع الطعام\n   (Use a knife to cut food)",
               DASH_DIFF, DASH_SV),
        radio("d_17", "17. أن تقوم بنشاطات ترفيهية تتطلب جهداً خفيفاً (مثل لعب الشطرنج)\n   (Recreational activities requiring little effort, e.g. cards / chess)",
               DASH_DIFF, DASH_SV),
        radio("d_18", "18. أن تقوم بنشاطات ترفيهية فيها قوة عبر الذراع أو الكتف أو اليد (مثل لعب التنس)\n   (Recreational activities with force through arm / shoulder / hand, e.g. tennis, hammering)",
               DASH_DIFF, DASH_SV),
        radio("d_19", "19. أن تقوم بنشاطات ترفيهية تحرك ذراعك بحرية (مثل رمي القرص / الفريسبي)\n   (Recreational activities in which you move your arm freely, e.g. frisbee, badminton)",
               DASH_DIFF, DASH_SV),
        radio("d_20", "20. أن تتنقل بالمواصلات من مكان لآخر بمساعدة أعضاء جسدك العلوية (مثل الإمساك بمقود السيارة)\n   (Transport yourself from place to place using upper limbs, e.g. steering)",
               DASH_DIFF, DASH_SV),
        # Item 21 "Sexual activities" is explicitly marked optional in the
        # source PDF ("الإجابه على هذا السؤال اختياري") and is intentionally
        # excluded here — only the mandatory 29 items are asked. The Work
        # Module and Sports/Performing Arts Module on PDF page 4 are also
        # optional add-on modules and are likewise excluded.

        # ── Social / Work Impact (items 22–23) ──
        radio("d_22", "22. هل أثرت المشكلة في ذراعك أو كتفك أو يدك خلال الأسبوع الماضي على نشاطاتك الاجتماعية العادية مع العائلة أو الأصدقاء؟\n   (During the past week, to what extent has your arm/shoulder/hand problem interfered with your normal social activities?)",
               DASH_IMPACT, DASH_SV),
        radio("d_23", "23. هل أثرت المشكلة في ذراعك أو كتفك أو يدك خلال الأسبوع الماضي على عملك أو نشاطاتك اليومية الاعتيادية الأخرى؟\n   (During the past week, were you limited in your work or other regular daily activities?)",
               DASH_LIMIT, DASH_SV),

        # ── Symptoms (items 24–28) ──
        radio("d_24", "24. وجع / ألم / عوار في الذراع أو الكتف أو اليد\n   (Arm, shoulder or hand pain)",
               DASH_PAIN, DASH_SV),
        radio("d_25", "25. وجع / ألم في الذراع أو الكتف أو اليد حينما أديت نشاطاً معيّناً\n   (Arm, shoulder or hand pain when doing a specific activity)",
               DASH_PAIN, DASH_SV),
        radio("d_26", "26. وخز (مثل وخز الإبر والدبابيس) في يدك أو ذراعك أو كتفك\n   (Tingling — pins and needles — in arm, shoulder or hand)",
               DASH_PAIN, DASH_SV),
        radio("d_27", "27. ضعف في ذراعك أو كتفك أو يدك\n   (Weakness in your arm, shoulder or hand)",
               DASH_PAIN, DASH_SV),
        radio("d_28", "28. تيبّس / تصلّب في ذراعك أو كتفك أو يدك\n   (Stiffness in your arm, shoulder or hand)",
               DASH_PAIN, DASH_SV),

        # ── Sleep (item 29) ──
        radio("d_29", "29. كم كانت صعوبة نومك خلال الأسبوع الماضي بسبب الوجع / الألم في ذراعك أو كتفك أو يدك؟\n   (During the past week, how much difficulty did you have sleeping because of pain in arm/shoulder/hand?)",
               DASH_SLEEP, DASH_SV),

        # ── Confidence (item 30) ──
        radio("d_30", "30. أشعر بأنني أقل ثقةً بنفسي بسبب مشكلة ذراعي أو كتفي أو يدي\n   (I feel less capable, less confident or less useful because of my arm/shoulder/hand problem)",
               DASH_AGREE, DASH_SV),
    ]


def dash_sections(region_prefix):
    """Returns DASH sections with unique IDs per region so the DB doesn't clash.
    29 mandatory items total (item 21 "Sexual activities" excluded — see
    dash_questions() above)."""
    return [
        {
            "id": f"{region_prefix}_activities",
            "title": "الأنشطة والمهام اليومية / Daily Activities (Items 1–20)",
            "questions": dash_questions()[:20],
        },
        {
            "id": f"{region_prefix}_impact",
            "title": "التأثير الاجتماعي والوظيفي / Social & Work Impact (Items 22–23)",
            "questions": dash_questions()[20:22],
        },
        {
            "id": f"{region_prefix}_symptoms",
            "title": "الأعراض والنوم / Symptoms & Sleep (Items 24–30)",
            "questions": dash_questions()[22:],
        },
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# ODI (Low Back) — 10 sections, scored 0-5 each, raw 0-50
# Formula: (rawSum / (answered×5)) × 100  →  0-100%  (lower = better)
# ═══════════════════════════════════════════════════════════════════════════════

ODI_SV = [0, 1, 2, 3, 4, 5]


def odi_sections():
    domains = [
        ("odi_pain", "Pain Intensity / شدة الألم",
         "How would you rate your current back pain?", [
             "I have no pain at the moment  /  لا يوجد ألم",
             "The pain is very mild  /  ألم خفيف جداً",
             "The pain is moderate  /  ألم متوسط",
             "The pain is fairly severe  /  ألم شديد نسبياً",
             "The pain is very severe  /  ألم شديد جداً",
             "The pain is the worst imaginable  /  أشد ألم يمكن تخيله",
         ]),
        ("odi_care", "Personal Care / العناية الشخصية",
         "How does your back pain affect your ability to look after yourself?", [
             "I can look after myself normally without pain",
             "I can look after myself normally but it is painful",
             "It is painful and I am slow and careful",
             "I need some help but manage most personal care",
             "I need help every day in most aspects of self care",
             "I do not get dressed; I wash with difficulty and stay in bed",
         ]),
        ("odi_lifting", "Lifting / رفع الأشياء",
         "How does your back pain affect your ability to lift things?", [
             "I can lift heavy weights without extra pain",
             "I can lift heavy weights but it gives extra pain",
             "Pain prevents me lifting heavy weights off the floor, but I can if conveniently placed",
             "Pain prevents me lifting heavy weights, but I manage light to medium if conveniently placed",
             "I can lift only very light weights",
             "I cannot lift or carry anything at all",
         ]),
        ("odi_walking", "Walking / المشي",
         "How does your back pain affect your ability to walk?", [
             "Pain does not prevent me walking any distance",
             "Pain prevents me walking more than 1 mile (1.6 km)",
             "Pain prevents me walking more than 0.5 mile (800 m)",
             "Pain prevents me walking more than 100 yards (90 m)",
             "I can only walk using a stick or crutches",
             "I am in bed most of the time and have to crawl to the toilet",
         ]),
        ("odi_sitting", "Sitting / الجلوس",
         "How does your back pain affect your ability to sit?", [
             "I can sit in any chair as long as I like",
             "I can only sit in my favourite chair as long as I like",
             "Pain prevents me sitting more than 1 hour",
             "Pain prevents me sitting more than 30 minutes",
             "Pain prevents me sitting more than 10 minutes",
             "Pain prevents me sitting at all",
         ]),
        ("odi_standing", "Standing / الوقوف",
         "How does your back pain affect your ability to stand?", [
             "I can stand as long as I want without extra pain",
             "I can stand as long as I want but it gives extra pain",
             "Pain prevents me standing more than 1 hour",
             "Pain prevents me standing more than 30 minutes",
             "Pain prevents me standing more than 10 minutes",
             "Pain prevents me standing at all",
         ]),
        ("odi_sleeping", "Sleeping / النوم",
         "How does your back pain affect your sleep?", [
             "My sleep is never disturbed by pain",
             "My sleep is occasionally disturbed by pain",
             "Because of pain I have less than 6 hours sleep",
             "Because of pain I have less than 4 hours sleep",
             "Because of pain I have less than 2 hours sleep",
             "Pain prevents me from sleeping at all",
         ]),
        ("odi_sexlife", "Sex Life / الحياة الزوجية",
         "How does your back pain affect your sex life (if applicable)?", [
             "My sex life is normal and causes no extra pain",
             "My sex life is normal but causes some extra pain",
             "My sex life is nearly normal but is very painful",
             "My sex life is severely restricted by pain",
             "My sex life is nearly absent because of pain",
             "Pain prevents any sex life at all",
         ]),
        ("odi_social", "Social Life / الحياة الاجتماعية",
         "How does your back pain affect your social life?", [
             "My social life is normal and causes no extra pain",
             "My social life is normal but increases the degree of pain",
             "Pain has no significant effect on my social life apart from limiting energetic interests (e.g. sport)",
             "Pain has restricted my social life and I do not go out as often",
             "Pain has restricted my social life to my home",
             "I have no social life because of pain",
         ]),
        ("odi_travel", "Traveling / السفر والتنقل",
         "How does your back pain affect your ability to travel?", [
             "I can travel anywhere without extra pain",
             "I can travel anywhere but it gives extra pain",
             "Pain is bad but I manage journeys over 2 hours",
             "Pain restricts me to journeys of less than 1 hour",
             "Pain restricts me to short necessary journeys under 30 minutes",
             "Pain prevents me from traveling except to receive treatment",
         ]),
    ]
    return [
        {"id": sid, "title": title, "questions": [radio(sid, text, opts, ODI_SV)]}
        for sid, title, text, opts in domains
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# NDI (Neck & Cervical) — 10 sections, scored 0-5 each, raw 0-50
# Same formula as ODI
# ═══════════════════════════════════════════════════════════════════════════════

def ndi_sections():
    domains = [
        ("ndi_pain", "Pain Intensity / شدة الألم",
         "How would you rate your current neck pain?", [
             "I have no pain at the moment",
             "The pain is very mild at the moment",
             "The pain is moderate at the moment",
             "The pain is fairly severe at the moment",
             "The pain is very severe at the moment",
             "The pain is the worst imaginable at the moment",
         ]),
        ("ndi_care", "Personal Care / العناية الشخصية",
         "How does your neck pain affect your ability to look after yourself?", [
             "I can look after myself normally without extra pain",
             "I can look after myself normally but it causes extra pain",
             "It is painful to look after myself and I am slow and careful",
             "I need some help but manage most of my personal care",
             "I need help every day in most aspects of self care",
             "I do not get dressed, wash with difficulty and stay in bed",
         ]),
        ("ndi_lifting", "Lifting / رفع الأشياء",
         "How does your neck pain affect your ability to lift things?", [
             "I can lift heavy weights without extra pain",
             "I can lift heavy weights but it gives extra pain",
             "Pain prevents me lifting heavy weights off the floor, but I can if conveniently placed",
             "Pain prevents me lifting heavy weights, but I can manage light to medium if conveniently placed",
             "I can lift only very light weights",
             "I cannot lift or carry anything at all",
         ]),
        ("ndi_reading", "Reading / القراءة",
         "How does your neck pain affect your ability to read?", [
             "I can read as much as I want with no neck pain",
             "I can read as much as I want with slight neck pain",
             "I can read as much as I want with moderate neck pain",
             "I cannot read as much as I want because of moderate neck pain",
             "I cannot read as much as I want because of severe neck pain",
             "I cannot read at all",
         ]),
        ("ndi_headaches", "Headaches / الصداع",
         "How does your neck pain relate to headaches?", [
             "I have no headaches at all",
             "I have slight headaches which come infrequently",
             "I have moderate headaches which come infrequently",
             "I have moderate headaches which come frequently",
             "I have severe headaches which come frequently",
             "I have headaches almost all the time",
         ]),
        ("ndi_concentration", "Concentration / التركيز",
         "How does your neck pain affect your ability to concentrate?", [
             "I can concentrate fully when I want with no difficulty",
             "I can concentrate fully with slight difficulty",
             "I have a fair degree of difficulty concentrating",
             "I have a lot of difficulty concentrating",
             "I have a great deal of difficulty concentrating",
             "I cannot concentrate at all",
         ]),
        ("ndi_work", "Work / العمل",
         "How does your neck pain affect your work?", [
             "I can do as much work as I want",
             "I can only do my usual work, but no more",
             "I can do most of my usual work, but no more",
             "I cannot do my usual work",
             "I can hardly do any work at all",
             "I cannot do any work at all",
         ]),
        ("ndi_driving", "Driving / قيادة السيارة",
         "How does your neck pain affect driving?", [
             "I can drive my car without any neck pain",
             "I can drive my car as long as I want with slight neck pain",
             "I can drive my car as long as I want with moderate neck pain",
             "I cannot drive my car as long as I want because of moderate neck pain",
             "I can hardly drive at all because of severe neck pain",
             "I cannot drive my car at all",
         ]),
        ("ndi_sleeping", "Sleeping / النوم",
         "How does your neck pain affect your sleep?", [
             "I have no trouble sleeping",
             "My sleep is slightly disturbed (less than 1 hour sleepless)",
             "My sleep is mildly disturbed (1–2 hours sleepless)",
             "My sleep is moderately disturbed (2–3 hours sleepless)",
             "My sleep is greatly disturbed (3–5 hours sleepless)",
             "My sleep is completely disturbed (5+ hours sleepless)",
         ]),
        ("ndi_recreation", "Recreation / الأنشطة الترفيهية",
         "How does your neck pain affect your recreation activities?", [
             "I am able to engage in all my recreation activities with no neck pain",
             "I am able to engage in all my recreation activities with some neck pain",
             "I am able to engage in most, but not all, of my usual recreation activities",
             "I am able to engage in only a few of my usual recreation activities",
             "I can hardly do any recreation activities because of neck pain",
             "I cannot do any recreation activities at all",
         ]),
    ]
    return [
        {"id": sid, "title": title, "questions": [radio(sid, text, opts, ODI_SV)]}
        for sid, title, text, opts in domains
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# SEFAS (Foot & Ankle) — 12 items, scored 4-0 each, raw 0-48
# Formula: (rawSum / 48) × 100  →  0-100  (higher = better function)
# ═══════════════════════════════════════════════════════════════════════════════

SEFAS_OPT = ["بلا صعوبة (No difficulty)", "بصعوبة خفيفة (Mild difficulty)",
             "بصعوبة متوسطة (Moderate difficulty)", "بصعوبة شديدة (Severe difficulty)",
             "غير قادر (Unable / Extreme)"]
SEFAS_SV  = [4, 3, 2, 1, 0]   # 4=best, 0=worst → higher raw = better function


def sefas_questions():
    return [
        radio("sf_1",  "1. الألم في قدمك / كاحلك أثناء الراحة\n   (Pain in your foot/ankle at rest)",
              SEFAS_OPT, SEFAS_SV),
        radio("sf_2",  "2. الألم في قدمك / كاحلك أثناء المشي على سطح مستوٍ\n   (Pain when walking on a flat surface)",
              SEFAS_OPT, SEFAS_SV),
        radio("sf_3",  "3. الألم في قدمك / كاحلك أثناء الليل\n   (Pain in your foot/ankle at night)",
              SEFAS_OPT, SEFAS_SV),
        radio("sf_4",  "4. مسافة المشي محدودة بسبب قدمك / كاحلك\n   (Walking distance is limited by your foot/ankle)",
              SEFAS_OPT, SEFAS_SV),
        radio("sf_5",  "5. المشي على أرض غير مستوية\n   (Walking on uneven ground)",
              SEFAS_OPT, SEFAS_SV),
        radio("sf_6",  "6. صعود أو نزول الدرج\n   (Walking up or down stairs)",
              SEFAS_OPT, SEFAS_SV),
        radio("sf_7",  "7. الوقوف لفترة طويلة\n   (Standing for a long period)",
              SEFAS_OPT, SEFAS_SV),
        radio("sf_8",  "8. إيجاد أحذية مريحة\n   (Finding footwear that is comfortable)",
              SEFAS_OPT, SEFAS_SV),
        radio("sf_9",  "9. العمل أو الأنشطة اليومية محدودة بسبب قدمك / كاحلك\n   (Work or daily activities limited by foot/ankle)",
              SEFAS_OPT, SEFAS_SV),
        radio("sf_10", "10. الأنشطة الرياضية أو الترفيهية محدودة بسبب قدمك / كاحلك\n   (Leisure or sporting activities limited by foot/ankle)",
              SEFAS_OPT, SEFAS_SV),
        radio("sf_11", "11. الثقة والتوازن أثناء المشي\n   (Confidence / stability when walking)",
              SEFAS_OPT, SEFAS_SV),
        radio("sf_12", "12. بشكل عام، كم أثرت مشكلة قدمك / كاحلك على حياتك اليومية هذا الأسبوع؟\n   (Overall, how much has your foot/ankle problem interfered with daily life this week?)",
              SEFAS_OPT, SEFAS_SV),
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# Config list for seeding
# ═══════════════════════════════════════════════════════════════════════════════

CONFIGS = [
    # ── KNEE ──────────────────────────────────────────────────────────────────
    {
        "bodyArea": "Knee",
        "configId": "knee-koos-jr",
        "title": "KOOS, JR — Knee / الركبة",
        "description": (
            "Knee injury and Osteoarthritis Outcome Score – Joint Replacement (KOOS-JR). "
            "7 items (Saudi-Arabic version). Raw 0–28 converted via official Rasch table to 0–100 "
            "(100 = no disability, 0 = worst)."
        ),
        "promName": "KOOS, JR",
        "scoreCalculation": "koos_hoos_jr",
        "scoreDirection": "higher_better",
        "rawMax": 28,
        "conversionTable": KOOS_JR_CONV,
        "icon": "🦵",
        "sections": [
            intake_section(),
            {"id": "koos_jr", "title": "KOOS, JR — استبيان الركبة (7 أسئلة)", "questions": koos_jr_questions()},
        ],
    },

    # ── HIP ───────────────────────────────────────────────────────────────────
    {
        "bodyArea": "Hip",
        "configId": "hip-hoos-full",
        "title": "HOOS Full — Hip / الورك",
        "description": (
            "Hip disability and Osteoarthritis Outcome Score – Full version (HOOS). "
            "40 items across 6 subscales (Symptoms, Stiffness, Pain, Daily Living, Sport, QoL). "
            "Each item scored 0–4 (0=Extreme, 4=None). "
            "Final score: (rawSum / 160) × 100 → 0–100 (100 = no disability)."
        ),
        "promName": "HOOS",
        "scoreCalculation": "sefas",          # reuses (raw/rawMax)*100 formula
        "scoreDirection": "higher_better",
        "rawMax": 160,                         # 40 items × 4
        "conversionTable": None,
        "icon": "🦴",
        "sections": [intake_section()] + hoos_sections(),
    },

    # ── SHOULDER ──────────────────────────────────────────────────────────────
    {
        "bodyArea": "Shoulder",
        "configId": "shoulder-dash",
        "title": "DASH — Shoulder / الكتف",
        "description": (
            "Disabilities of the Arm, Shoulder and Hand – 29 mandatory items (Arabic); "
            "the official optional 'sexual activities' item and the optional Work / "
            "Sports modules are excluded. Each item scored 1–5 (1=No difficulty, 5=Unable). "
            "Formula: ((sum/n) − 1) × 25 → 0–100 (0=no disability, 100=maximum disability). "
            "Minimum 26 of 29 items required."
        ),
        "promName": "DASH",
        "scoreCalculation": "quickdash",      # same formula works for full DASH
        "scoreDirection": "lower_better",
        "rawMax": 145,                         # 29 items × 5 (for reference only, formula uses avg)
        "conversionTable": None,
        "icon": "🙆",
        "sections": [intake_section()] + dash_sections("shoulder"),
    },

    # ── ELBOW ─────────────────────────────────────────────────────────────────
    {
        "bodyArea": "Elbow",
        "configId": "elbow-dash",
        "title": "DASH — Elbow / الكوع",
        "description": (
            "Disabilities of the Arm, Shoulder and Hand – 29 mandatory items (Arabic); "
            "the official optional 'sexual activities' item and the optional Work / "
            "Sports modules are excluded. "
            "Formula: ((sum/n) − 1) × 25 → 0–100 (0=no disability, 100=maximum)."
        ),
        "promName": "DASH",
        "scoreCalculation": "quickdash",
        "scoreDirection": "lower_better",
        "rawMax": 145,
        "conversionTable": None,
        "icon": "💪",
        "sections": [intake_section()] + dash_sections("elbow"),
    },

    # ── HAND & WRIST ──────────────────────────────────────────────────────────
    {
        "bodyArea": "Hand & Wrist",
        "configId": "hand-wrist-dash",
        "title": "DASH — Hand & Wrist / اليد والمعصم",
        "description": (
            "Disabilities of the Arm, Shoulder and Hand – 29 mandatory items (Arabic); "
            "the official optional 'sexual activities' item and the optional Work / "
            "Sports modules are excluded. "
            "Formula: ((sum/n) − 1) × 25 → 0–100 (0=no disability, 100=maximum)."
        ),
        "promName": "DASH",
        "scoreCalculation": "quickdash",
        "scoreDirection": "lower_better",
        "rawMax": 145,
        "conversionTable": None,
        "icon": "✋",
        "sections": [intake_section()] + dash_sections("handwrist"),
    },

    # ── LOW BACK ──────────────────────────────────────────────────────────────
    {
        "bodyArea": "Low Back",
        "configId": "low-back-odi",
        "title": "ODI — Low Back / أسفل الظهر",
        "description": (
            "Oswestry Disability Index v2.1a. "
            "10 sections scored 0–5 each. "
            "Formula: (rawSum / (answered×5)) × 100 → 0–100% "
            "(0=no disability, 100=maximum disability)."
        ),
        "promName": "ODI",
        "scoreCalculation": "odi_ndi",
        "scoreDirection": "lower_better",
        "rawMax": 50,
        "conversionTable": None,
        "icon": "🧍",
        "sections": [intake_section()] + odi_sections(),
    },

    # ── NECK & CERVICAL ───────────────────────────────────────────────────────
    {
        "bodyArea": "Neck & Cervical",
        "configId": "neck-cervical-ndi",
        "title": "NDI — Neck & Cervical / الرقبة والعنق",
        "description": (
            "Neck Disability Index. "
            "10 sections scored 0–5 each. "
            "Formula: (rawSum / (answered×5)) × 100 → 0–100% "
            "(0=no disability, 100=maximum disability)."
        ),
        "promName": "NDI",
        "scoreCalculation": "odi_ndi",
        "scoreDirection": "lower_better",
        "rawMax": 50,
        "conversionTable": None,
        "icon": "🙇",
        "sections": [intake_section()] + ndi_sections(),
    },

    # ── FOOT & ANKLE ──────────────────────────────────────────────────────────
    {
        "bodyArea": "Foot & Ankle",
        "configId": "foot-ankle-sefas",
        "title": "SEFAS — Foot & Ankle / القدم والكاحل",
        "description": (
            "Self-Reported Foot and Ankle Score (SEFAS). "
            "12 items scored 0–4 (4=No difficulty, 0=Unable). "
            "Formula: (rawSum / 48) × 100 → 0–100 (0=worst, 100=best)."
        ),
        "promName": "SEFAS",
        "scoreCalculation": "sefas",
        "scoreDirection": "higher_better",
        "rawMax": 48,
        "conversionTable": None,
        "icon": "🦶",
        "sections": [
            intake_section(),
            {"id": "sefas", "title": "SEFAS — استبيان القدم والكاحل (12 أسئلة)", "questions": sefas_questions()},
        ],
    },
]


# ─── Seed ────────────────────────────────────────────────────────────────────

def seed():
    print("Creating / verifying tables …")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        for cfg in CONFIGS:
            existing = db.query(AssessmentConfig).filter(
                AssessmentConfig.bodyArea == cfg["bodyArea"]
            ).first()
            if existing:
                db.delete(existing)
                db.flush()
            db.add(AssessmentConfig(**cfg))
        db.commit()
        print(
            f"✅  Seeded / updated {len(CONFIGS)} PROM configs:\n"
            + "\n".join(
                f"   {c['bodyArea']:20s}  {c['promName']:10s}  "
                f"{sum(len(s['questions']) for s in c['sections'])} questions"
                for c in CONFIGS
            )
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed()
