"""Seeds the 8 standardized PROM instruments (KOOS-JR, HOOS-JR, QuickDASH x3,
ODI, NDI, SEFAS) into `assessment_configs`, replacing the old generic
Knee/Shoulder/Spine content with real validated instruments.

Content confidence:
  - QuickDASH (Shoulder/Elbow/Hand & Wrist), ODI (Low Back), NDI (Neck &
    Cervical) use the standard, widely-published item sets for those
    instruments — high confidence.
  - SEFAS (Foot & Ankle), KOOS-JR (Knee), HOOS-JR (Hip) items below are
    representative placeholders built from each instrument's known domains,
    NOT verified against the official licensed questionnaire — flagged with
    "[PLACEHOLDER]" in each config's description. Replace before real
    clinical/billing use.
  - KOOS-JR/HOOS-JR also lack the official non-linear raw->interval
    conversion table; `conversionTable` is left None so the scoring engine
    falls back to a linear approximation (see frontend/src/utils/scoring.js).

Safe to re-run: each region is deleted and re-inserted (upsert-by-bodyArea),
so improving this content later (e.g. once an official source is supplied)
is just editing this file and re-running it.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from database import engine, SessionLocal, Base
from models import AssessmentConfig


def pain_item():
    """Shared 0-10 NRS pain item, prepended to every region — not scored
    into the instrument's own total (scoreValues: None), it only feeds the
    existing standalone "Pain Score (NRS)" card in Physician Evaluation."""
    return {
        "id": "pain_scale", "type": "numeric", "required": True,
        "text": "On a scale of 0 to 10, what is your average pain level this week?",
        "description": "0 = no pain, 10 = worst pain imaginable",
        "min": 0, "max": 10, "step": 1, "scoreValues": None,
    }


def radio(qid, text, options, score_values, required=True, description=None):
    q = {"id": qid, "type": "radio", "required": required, "text": text,
         "options": options, "scoreValues": score_values}
    if description:
        q["description"] = description
    return q


def intake_section():
    return {"id": "intake", "title": "Pain Intake", "questions": [pain_item()]}


# ─── QuickDASH (Shoulder / Elbow / Hand & Wrist) ────────────────────────────
# Standard 11-item short-form DASH. Difficulty items scored 1 (No
# Difficulty) .. 5 (Unable); formula: ((sum/n) - 1) * 25.
QUICKDASH_DIFFICULTY = ["No Difficulty", "Mild Difficulty", "Moderate Difficulty", "Severe Difficulty", "Unable"]
QUICKDASH_INTERFERENCE = ["Not at all", "Slightly", "Moderately", "Quite a bit", "Extremely"]
QUICKDASH_SEVERITY = ["None", "Mild", "Moderate", "Severe", "Extreme"]
QUICKDASH_SV = [1, 2, 3, 4, 5]

def quickdash_questions():
    return [
        radio("qd_jar", "Open a tight or new jar", QUICKDASH_DIFFICULTY, QUICKDASH_SV),
        radio("qd_chores", "Do heavy household chores (e.g. wash walls, floors)", QUICKDASH_DIFFICULTY, QUICKDASH_SV),
        radio("qd_carry", "Carry a shopping bag or briefcase", QUICKDASH_DIFFICULTY, QUICKDASH_SV),
        radio("qd_wash_back", "Wash your back", QUICKDASH_DIFFICULTY, QUICKDASH_SV),
        radio("qd_knife", "Use a knife to cut food", QUICKDASH_DIFFICULTY, QUICKDASH_SV),
        radio("qd_recreation", "Recreational activities involving some force or impact through the arm, shoulder or hand (e.g. golf, hammering, tennis)", QUICKDASH_DIFFICULTY, QUICKDASH_SV),
        radio("qd_social", "During the past week, to what extent has your arm, shoulder or hand problem interfered with your normal social activities with family, friends, neighbours or groups?", QUICKDASH_INTERFERENCE, QUICKDASH_SV),
        radio("qd_work_limit", "During the past week, were you limited in your work or other regular daily activities as a result of your arm, shoulder or hand problem?", QUICKDASH_INTERFERENCE, QUICKDASH_SV),
        radio("qd_pain", "Arm, shoulder or hand pain", QUICKDASH_SEVERITY, QUICKDASH_SV),
        radio("qd_tingling", "Tingling (pins and needles) in your arm, shoulder or hand", QUICKDASH_SEVERITY, QUICKDASH_SV),
        radio("qd_sleep", "Difficulty sleeping because of the pain in your arm, shoulder or hand", QUICKDASH_SEVERITY, QUICKDASH_SV),
    ]


# ─── ODI (Low Back) / NDI (Neck & Cervical) ─────────────────────────────────
# Each domain is one section with a single 6-statement item, scored 0
# (least disability) .. 5 (most disability). Formula:
# (total / (answered * 5)) * 100.
ODI_SV = [0, 1, 2, 3, 4, 5]

def odi_sections():
    domains = [
        ("odi_pain", "Pain Intensity", "How would you rate your current pain?", [
            "I have no pain at the moment",
            "The pain is very mild at the moment",
            "The pain is moderate at the moment",
            "The pain is fairly severe at the moment",
            "The pain is very severe at the moment",
            "The pain is the worst imaginable at the moment",
        ]),
        ("odi_care", "Personal Care", "How does your back pain affect washing and dressing?", [
            "I can look after myself normally without pain",
            "I can look after myself normally but it is painful",
            "It is painful and I am slow and careful",
            "I need some help but manage most personal care",
            "I need help every day in most aspects of self care",
            "I do not get dressed, wash with difficulty and stay in bed",
        ]),
        ("odi_lifting", "Lifting", "How does your back pain affect lifting?", [
            "I can lift heavy weights without extra pain",
            "I can lift heavy weights but it gives extra pain",
            "Pain prevents me lifting heavy weights off the floor, but I can if conveniently placed (e.g. on a table)",
            "Pain prevents me lifting heavy weights, but I can manage light to medium weights if conveniently placed",
            "I can lift only very light weights",
            "I cannot lift or carry anything at all",
        ]),
        ("odi_walking", "Walking", "How does your back pain affect walking?", [
            "Pain does not prevent me walking any distance",
            "Pain prevents me walking more than 1 mile",
            "Pain prevents me walking more than 1/2 a mile",
            "Pain prevents me walking more than 100 yards",
            "I can only walk using a stick or crutches",
            "I am in bed most of the time and have to crawl to the toilet",
        ]),
        ("odi_sitting", "Sitting", "How does your back pain affect sitting?", [
            "I can sit in any chair as long as I like",
            "I can only sit in my favourite chair as long as I like",
            "Pain prevents me sitting more than 1 hour",
            "Pain prevents me sitting more than 30 minutes",
            "Pain prevents me sitting more than 10 minutes",
            "Pain prevents me sitting at all",
        ]),
        ("odi_standing", "Standing", "How does your back pain affect standing?", [
            "I can stand as long as I want without extra pain",
            "I can stand as long as I want but it gives extra pain",
            "Pain prevents me standing more than 1 hour",
            "Pain prevents me standing more than 30 minutes",
            "Pain prevents me standing more than 10 minutes",
            "Pain prevents me standing at all",
        ]),
        ("odi_sleeping", "Sleeping", "How does your back pain affect sleeping?", [
            "My sleep is never disturbed by pain",
            "My sleep is occasionally disturbed by pain",
            "Because of pain I have less than 6 hours sleep",
            "Because of pain I have less than 4 hours sleep",
            "Because of pain I have less than 2 hours sleep",
            "Pain prevents me from sleeping at all",
        ]),
        ("odi_sexlife", "Sex Life", "How does your back pain affect your sex life (if applicable)?", [
            "My sex life is normal and causes no extra pain",
            "My sex life is normal but causes some extra pain",
            "My sex life is nearly normal but is very painful",
            "My sex life is severely restricted by pain",
            "My sex life is nearly absent because of pain",
            "Pain prevents any sex life at all",
        ]),
        ("odi_social", "Social Life", "How does your back pain affect your social life?", [
            "My social life is normal and causes no extra pain",
            "My social life is normal but increases the degree of pain",
            "Pain has no significant effect on my social life apart from limiting energetic interests (e.g. sport)",
            "Pain has restricted my social life and I do not go out as often",
            "Pain has restricted my social life to my home",
            "I have no social life because of pain",
        ]),
        ("odi_travel", "Traveling", "How does your back pain affect traveling?", [
            "I can travel anywhere without pain",
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


def ndi_sections():
    domains = [
        ("ndi_pain", "Pain Intensity", "How would you rate your current neck pain?", [
            "I have no pain at the moment",
            "The pain is very mild at the moment",
            "The pain is moderate at the moment",
            "The pain is fairly severe at the moment",
            "The pain is very severe at the moment",
            "The pain is the worst imaginable at the moment",
        ]),
        ("ndi_care", "Personal Care", "How does your neck pain affect washing and dressing?", [
            "I can look after myself normally without extra pain",
            "I can look after myself normally but it causes extra pain",
            "It is painful to look after myself and I am slow and careful",
            "I need some help but manage most of my personal care",
            "I need help every day in most aspects of self care",
            "I do not get dressed, wash with difficulty and stay in bed",
        ]),
        ("ndi_lifting", "Lifting", "How does your neck pain affect lifting?", [
            "I can lift heavy weights without extra pain",
            "I can lift heavy weights but it gives extra pain",
            "Pain prevents me lifting heavy weights off the floor, but I can if conveniently placed",
            "Pain prevents me lifting heavy weights, but I can manage light to medium weights if conveniently placed",
            "I can lift only very light weights",
            "I cannot lift or carry anything at all",
        ]),
        ("ndi_reading", "Reading", "How does your neck pain affect reading?", [
            "I can read as much as I want with no neck pain",
            "I can read as much as I want with slight neck pain",
            "I can read as much as I want with moderate neck pain",
            "I cannot read as much as I want because of moderate neck pain",
            "I cannot read as much as I want because of severe neck pain",
            "I cannot read at all",
        ]),
        ("ndi_headaches", "Headaches", "How does your neck pain relate to headaches?", [
            "I have no headaches at all",
            "I have slight headaches which come infrequently",
            "I have moderate headaches which come infrequently",
            "I have moderate headaches which come frequently",
            "I have severe headaches which come frequently",
            "I have headaches almost all the time",
        ]),
        ("ndi_concentration", "Concentration", "How does your neck pain affect concentration?", [
            "I can concentrate fully when I want with no difficulty",
            "I can concentrate fully with slight difficulty",
            "I have a fair degree of difficulty concentrating",
            "I have a lot of difficulty concentrating",
            "I have a great deal of difficulty concentrating",
            "I cannot concentrate at all",
        ]),
        ("ndi_work", "Work", "How does your neck pain affect work?", [
            "I can do as much work as I want",
            "I can only do my usual work, no more",
            "I can do most of my usual work, no more",
            "I cannot do my usual work",
            "I can hardly do any work at all",
            "I cannot do any work at all",
        ]),
        ("ndi_driving", "Driving", "How does your neck pain affect driving?", [
            "I can drive my car without any neck pain",
            "I can drive my car as long as I want with slight neck pain",
            "I can drive my car as long as I want with moderate neck pain",
            "I cannot drive my car as long as I want because of moderate neck pain",
            "I can hardly drive at all because of severe neck pain",
            "I cannot drive my car at all",
        ]),
        ("ndi_sleeping", "Sleeping", "How does your neck pain affect sleeping?", [
            "I have no trouble sleeping",
            "My sleep is slightly disturbed (less than 1 hour sleepless)",
            "My sleep is mildly disturbed (1-2 hours sleepless)",
            "My sleep is moderately disturbed (2-3 hours sleepless)",
            "My sleep is greatly disturbed (3-5 hours sleepless)",
            "My sleep is completely disturbed",
        ]),
        ("ndi_recreation", "Recreation", "How does your neck pain affect recreation?", [
            "I am able to engage in all my recreation activities with no neck pain",
            "I am able to engage in all my recreation activities with some neck pain",
            "I am able to engage in most, but not all, of my usual recreation activities because of pain",
            "I am able to engage in only a few of my usual recreation activities because of neck pain",
            "I can hardly do any recreation activities because of neck pain",
            "I cannot do any recreation activities at all",
        ]),
    ]
    return [
        {"id": sid, "title": title, "questions": [radio(sid, text, opts, ODI_SV)]}
        for sid, title, text, opts in domains
    ]


# ─── SEFAS (Foot & Ankle) — [PLACEHOLDER], verify against official form ─────
SEFAS_5 = ["No difficulty", "Mild difficulty", "Moderate difficulty", "Severe difficulty", "Unable / extreme"]
SEFAS_SV = [4, 3, 2, 1, 0]  # higher = better function, matches "0=worst, 100=best"

def sefas_questions():
    return [
        radio("sf_pain_rest", "Pain in your foot/ankle at rest", SEFAS_5, SEFAS_SV),
        radio("sf_pain_walk", "Pain in your foot/ankle when walking on a flat surface", SEFAS_5, SEFAS_SV),
        radio("sf_pain_night", "Pain in your foot/ankle at night", SEFAS_5, SEFAS_SV),
        radio("sf_walk_distance", "Walking distance is limited by your foot/ankle", SEFAS_5, SEFAS_SV),
        radio("sf_uneven", "Walking on uneven ground", SEFAS_5, SEFAS_SV),
        radio("sf_stairs", "Walking up or down stairs", SEFAS_5, SEFAS_SV),
        radio("sf_standing", "Standing for a long period", SEFAS_5, SEFAS_SV),
        radio("sf_footwear", "Finding footwear that is comfortable", SEFAS_5, SEFAS_SV),
        radio("sf_work", "Your usual work or daily activities are limited by your foot/ankle", SEFAS_5, SEFAS_SV),
        radio("sf_leisure", "Your leisure or sporting activities are limited by your foot/ankle", SEFAS_5, SEFAS_SV),
        radio("sf_confidence", "Confidence/stability of your foot/ankle when walking", SEFAS_5, SEFAS_SV),
        radio("sf_overall", "Overall, how much has your foot/ankle problem interfered with your daily life this week?", SEFAS_5, SEFAS_SV),
    ]


# ─── KOOS-JR (Knee) / HOOS-JR (Hip) — [PLACEHOLDER], verify against ─────────
# official HSS-licensed instrument and conversion table.
JR_5 = ["None", "Mild", "Moderate", "Severe", "Extreme"]
JR_SV = [0, 1, 2, 3, 4]  # higher raw = more problems; linear fallback inverts to final score

def koos_jr_questions():
    return [
        radio("kj_pain_freq", "How often do you experience knee pain?", JR_5, JR_SV),
        radio("kj_pain_twist", "Pain twisting/pivoting on your knee", JR_5, JR_SV),
        radio("kj_pain_stairs", "Pain going up or down stairs", JR_5, JR_SV),
        radio("kj_stiffness", "Knee stiffness after first waking in the morning", JR_5, JR_SV),
        radio("kj_stand_sit", "Difficulty rising from sitting because of your knee", JR_5, JR_SV),
        radio("kj_descend_stairs", "Difficulty descending stairs because of your knee", JR_5, JR_SV),
        radio("kj_qol", "How much has your knee problem affected your day-to-day life this week?", JR_5, JR_SV),
    ]


def hoos_jr_questions():
    return [
        radio("hj_pain_walk", "Pain walking on a flat surface because of your hip", JR_5, JR_SV),
        radio("hj_pain_stand", "Pain standing because of your hip", JR_5, JR_SV),
        radio("hj_pain_stairs", "Pain going up or down stairs because of your hip", JR_5, JR_SV),
        radio("hj_stiffness", "Hip stiffness after first waking in the morning", JR_5, JR_SV),
        radio("hj_socks", "Difficulty putting on socks/stockings because of your hip", JR_5, JR_SV),
        radio("hj_qol", "How much has your hip problem affected your day-to-day life this week?", JR_5, JR_SV),
    ]


CONFIGS = [
    {
        "bodyArea": "Knee", "configId": "knee-koos-jr", "title": "KOOS, JR — Knee",
        "description": "[PLACEHOLDER content, verify before clinical use] Knee injury and Osteoarthritis Outcome Score, Joint Replacement (short form).",
        "promName": "KOOS, JR", "scoreCalculation": "koos_hoos_jr", "scoreDirection": "higher_better",
        "rawMax": 28, "conversionTable": None, "icon": "🦵",
        "sections": [intake_section(), {"id": "koos_jr", "title": "KOOS, JR", "questions": koos_jr_questions()}],
    },
    {
        "bodyArea": "Hip", "configId": "hip-hoos-jr", "title": "HOOS, JR — Hip",
        "description": "[PLACEHOLDER content, verify before clinical use] Hip disability and Osteoarthritis Outcome Score, Joint Replacement (short form).",
        "promName": "HOOS, JR", "scoreCalculation": "koos_hoos_jr", "scoreDirection": "higher_better",
        "rawMax": 24, "conversionTable": None, "icon": "🦴",
        "sections": [intake_section(), {"id": "hoos_jr", "title": "HOOS, JR", "questions": hoos_jr_questions()}],
    },
    {
        "bodyArea": "Shoulder", "configId": "shoulder-quickdash", "title": "QuickDASH — Shoulder",
        "description": "Quick Disabilities of the Arm, Shoulder and Hand — short form.",
        "promName": "QuickDASH", "scoreCalculation": "quickdash", "scoreDirection": "lower_better",
        "rawMax": 55, "conversionTable": None, "icon": "🙆",
        "sections": [intake_section(), {"id": "quickdash", "title": "QuickDASH", "questions": quickdash_questions()}],
    },
    {
        "bodyArea": "Elbow", "configId": "elbow-quickdash", "title": "QuickDASH — Elbow",
        "description": "Quick Disabilities of the Arm, Shoulder and Hand — short form.",
        "promName": "QuickDASH", "scoreCalculation": "quickdash", "scoreDirection": "lower_better",
        "rawMax": 55, "conversionTable": None, "icon": "💪",
        "sections": [intake_section(), {"id": "quickdash", "title": "QuickDASH", "questions": quickdash_questions()}],
    },
    {
        "bodyArea": "Hand & Wrist", "configId": "hand-wrist-quickdash", "title": "QuickDASH — Hand & Wrist",
        "description": "Quick Disabilities of the Arm, Shoulder and Hand — short form.",
        "promName": "QuickDASH", "scoreCalculation": "quickdash", "scoreDirection": "lower_better",
        "rawMax": 55, "conversionTable": None, "icon": "✋",
        "sections": [intake_section(), {"id": "quickdash", "title": "QuickDASH", "questions": quickdash_questions()}],
    },
    {
        "bodyArea": "Low Back", "configId": "low-back-odi", "title": "ODI — Low Back",
        "description": "Oswestry Disability Index, version 2.1a.",
        "promName": "ODI", "scoreCalculation": "odi_ndi", "scoreDirection": "lower_better",
        "rawMax": 50, "conversionTable": None, "icon": "🧍",
        "sections": [intake_section()] + odi_sections(),
    },
    {
        "bodyArea": "Neck & Cervical", "configId": "neck-cervical-ndi", "title": "NDI — Neck & Cervical",
        "description": "Neck Disability Index.",
        "promName": "NDI", "scoreCalculation": "odi_ndi", "scoreDirection": "lower_better",
        "rawMax": 50, "conversionTable": None, "icon": "🙇",
        "sections": [intake_section()] + ndi_sections(),
    },
    {
        "bodyArea": "Foot & Ankle", "configId": "foot-ankle-sefas", "title": "SEFAS — Foot & Ankle",
        "description": "[PLACEHOLDER content, verify before clinical use] Self-Reported Foot and Ankle Score.",
        "promName": "SEFAS", "scoreCalculation": "sefas", "scoreDirection": "higher_better",
        "rawMax": 48, "conversionTable": None, "icon": "🦶",
        "sections": [intake_section(), {"id": "sefas", "title": "SEFAS", "questions": sefas_questions()}],
    },
]


def seed():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        for cfg in CONFIGS:
            existing = db.query(AssessmentConfig).filter(AssessmentConfig.bodyArea == cfg["bodyArea"]).first()
            if existing:
                db.delete(existing)
                db.flush()
            db.add(AssessmentConfig(**cfg))
        db.commit()
        print(f"Seeded/updated {len(CONFIGS)} PROM configs: {', '.join(c['bodyArea'] for c in CONFIGS)}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
