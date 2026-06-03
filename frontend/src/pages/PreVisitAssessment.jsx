import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';
import { ASSESSMENT_QUESTIONS, BODY_AREAS } from '../data/mockData';

export default function PreVisitAssessment({ patients, onAddAssessment, onUpdateStatus }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patient');
  const isFollowUp = searchParams.get('type') === 'followup';

  const patient = patients.find((p) => p.id === patientId);

  const [bodyArea, setBodyArea] = useState(patient?.bodyArea || 'Knee');
  const [answers, setAnswers] = useState({});
  const [currentStep, setCurrentStep] = useState(0); // 0 = select body area, 1..20 = questions, 21 = review
  const [submitted, setSubmitted] = useState(false);

  const questions = useMemo(() => ASSESSMENT_QUESTIONS[bodyArea] || ASSESSMENT_QUESTIONS['Other'], [bodyArea]);
  const totalSteps = questions.length + 2; // body area + questions + review

  const answeredCount = Object.keys(answers).length;
  const score = useMemo(() => Object.values(answers).reduce((sum, v) => sum + v, 0), [answers]);
  const maxScore = questions.length * 3;

  const handleSelectOption = (qId, optionIdx) => {
    setAnswers((prev) => ({ ...prev, [qId]: optionIdx }));
  };

  const handleSubmit = () => {
    const assessment = {
      id: `a${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: isFollowUp ? 'Follow-Up' : 'Pre-Visit',
      score,
      maxScore,
      bodyArea,
      completedBy: 'Nurse Sara',
      answers
    };
    if (onAddAssessment) onAddAssessment(patientId, assessment);
    if (onUpdateStatus) onUpdateStatus(patientId, 'assessment-completed');
    setSubmitted(true);
  };

  if (!patient) {
    return (
      <>
        <div className="topbar"><div className="topbar-left"><h1>Assessment</h1></div></div>
        <div className="page-body">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>No patient selected. Go to the dashboard first.</p>
            <button className="btn btn-primary mt-4" onClick={() => navigate('/')}>Dashboard</button>
          </div>
        </div>
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <div className="topbar"><div className="topbar-left"><h1>Assessment Completed</h1></div></div>
        <div className="page-body">
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Assessment Submitted</h2>
            <p className="text-muted mb-4">
              {isFollowUp ? 'Follow-up' : 'Pre-visit'} assessment for {patient.name} has been saved.
            </p>
            <div style={{ display: 'inline-flex', gap: 8, background: 'var(--primary-light)', padding: '12px 24px', borderRadius: 12, marginBottom: 24 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)' }}>{score}</span>
              <span style={{ color: 'var(--text-muted)', alignSelf: 'flex-end', paddingBottom: 2 }}>/ {maxScore}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate(`/patient/${patient.id}`)}>View Profile</button>
              <button className="btn btn-outline" onClick={() => navigate('/')}>Dashboard</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
          <div>
            <h1>{isFollowUp ? 'Follow-Up' : 'Pre-Visit'} Assessment</h1>
            <p>{patient.name} · {patient.mrn}</p>
          </div>
        </div>
        <div className="topbar-right">
          <span className="text-sm text-muted">{answeredCount}/{questions.length} answered</span>
        </div>
      </div>

      <div className="page-body">
        {/* Progress bar */}
        <div style={{ background: 'var(--border)', borderRadius: 99, height: 6, marginBottom: 28, overflow: 'hidden' }}>
          <div style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: 99, transition: 'width 0.3s ease' }} />
        </div>

        {/* Step 0: Body Area */}
        {currentStep === 0 && (
          <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Select Body Area</h3>
            <p className="text-muted mb-4">Choose the area that best matches the patient's primary concern.</p>
            <div className="options-grid">
              {BODY_AREAS.map((area) => (
                <button
                  key={area}
                  className={`option-btn ${bodyArea === area ? 'selected' : ''}`}
                  onClick={() => setBodyArea(area)}
                >
                  <span className="option-radio" />
                  {area}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-primary" onClick={() => setCurrentStep(1)}>
                Start Assessment <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Question Steps */}
        {currentStep >= 1 && currentStep <= questions.length && (
          <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
            <div className={`question-card ${answers[questions[currentStep - 1].id] !== undefined ? 'answered' : ''}`} style={{ border: 'none', padding: 0 }}>
              <div className="question-num">Question {currentStep} of {questions.length}</div>
              <div className="question-text">{questions[currentStep - 1].text}</div>
              <div className="options-grid">
                {questions[currentStep - 1].options.map((opt, idx) => (
                  <button
                    key={idx}
                    className={`option-btn ${answers[questions[currentStep - 1].id] === idx ? 'selected' : ''}`}
                    onClick={() => handleSelectOption(questions[currentStep - 1].id, idx)}
                  >
                    <span className="option-radio" />
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setCurrentStep((s) => s - 1)}>Back</button>
              <button
                className="btn btn-primary"
                onClick={() => setCurrentStep((s) => s + 1)}
                disabled={answers[questions[currentStep - 1].id] === undefined}
              >
                {currentStep === questions.length ? 'Review' : 'Next'} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Review Step */}
        {currentStep === questions.length + 1 && (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div className="card mb-4">
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Review Assessment</h3>
              <p className="text-muted mb-4">Review the answers before submitting.</p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--primary-light)', padding: '12px 20px', borderRadius: 10, marginBottom: 20 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{score}</span>
                <span className="text-muted"> / {maxScore} points</span>
                <span style={{ marginLeft: 'auto' }} className="text-sm">{bodyArea}</span>
              </div>

              {questions.map((q, i) => (
                <div key={q.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Q{i + 1}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{q.text}</div>
                  <div style={{ fontSize: 13, color: answers[q.id] !== undefined ? 'var(--primary)' : 'var(--danger)' }}>
                    {answers[q.id] !== undefined ? (
                      <><Check size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />{q.options[answers[q.id]]}</>
                    ) : 'Not answered'}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-ghost" onClick={() => setCurrentStep(questions.length)}>Back</button>
              <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={answeredCount < questions.length}>
                Submit Assessment
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
