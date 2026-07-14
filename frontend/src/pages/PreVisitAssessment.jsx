import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

import { ASSESSMENT_CONFIG, calculateQuickDASH } from '../data/mockData';
import PatientSummaryCard from '../components/assessment/PatientSummaryCard';
import VisitSummaryCard from '../components/assessment/VisitSummaryCard';
import AssessmentHeader from '../components/assessment/AssessmentHeader';
import AssessmentSidebar from '../components/assessment/AssessmentSidebar';
import QuestionRenderer from '../components/assessment/QuestionRenderer';
import AssessmentNavigation from '../components/assessment/AssessmentNavigation';
import SummaryPage from '../components/assessment/SummaryPage';

const DRAFT_KEY = (patientId) => `assessment_draft_${patientId}`;

function getInitialAnswers(patientId) {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(patientId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function countAnswered(section, answers) {
  return section.questions.filter(q => {
    const a = answers[q.id];
    return a !== undefined && a !== null && a !== '' && !(Array.isArray(a) && a.length === 0);
  }).length;
}

export default function PreVisitAssessment({ patients, onAddAssessment, onUpdateStatus }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patient');
  const isFollowUp = searchParams.get('type') === 'followup';

  const patient = patients.find(p => p.id === patientId);
  const config = useMemo(() =>
    ASSESSMENT_CONFIG[patient?.bodyArea] || ASSESSMENT_CONFIG['Other'],
    [patient]
  );

  const sections = useMemo(() => config?.sections || [], [config]);
  const allQuestions = useMemo(() => sections.flatMap(s => s.questions), [sections]);

  const [answers, setAnswers] = useState(() => getInitialAnswers(patientId));
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [chiefComplaint, setChiefComplaint] = useState(patient?.bodyArea ? `${patient.bodyArea} pain` : 'Pain');
  const [errors, setErrors] = useState({});
  const [showSummary, setShowSummary] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  // Auto-persist to localStorage
  useEffect(() => {
    if (patientId) {
      localStorage.setItem(DRAFT_KEY(patientId), JSON.stringify(answers));
    }
  }, [answers, patientId]);

  const currentQuestion = allQuestions[currentQuestionIndex];
  
  const currentSection = useMemo(() => {
    if (!currentQuestion) return sections[0];
    return sections.find(s => s.questions.some(q => q.id === currentQuestion.id)) || sections[0];
  }, [currentQuestion, sections]);

  const currentSectionId = currentSection?.id || '';
  const currentSectionIndex = sections.findIndex(s => s.id === currentSectionId);

  const totalQuestions = allQuestions.length;
  const answeredQuestions = sections.reduce((acc, s) => acc + countAnswered(s, answers), 0);
  const overallProgress = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  const handleAnswer = useCallback((questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    setErrors(prev => ({ ...prev, [questionId]: null }));
  }, []);

  const validateQuestion = (question) => {
    if (!question) return true;
    if (question.required) {
      const a = answers[question.id];
      const isEmpty = a === undefined || a === null || a === '' || (Array.isArray(a) && a.length === 0);
      if (isEmpty) {
        setErrors(prev => ({ ...prev, [question.id]: 'This question is required.' }));
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateQuestion(currentQuestion)) return;
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setErrors({});
    } else {
      setShowSummary(true);
    }
  };

  const handlePrev = () => {
    if (showSummary) {
      setShowSummary(false);
      return;
    }
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setErrors({});
    }
  };

  const handleSelectSection = (sectionId) => {
    setShowSummary(false);
    const section = sections.find(s => s.id === sectionId);
    if (section && section.questions.length > 0) {
      const firstQId = section.questions[0].id;
      const idx = allQuestions.findIndex(q => q.id === firstQId);
      if (idx !== -1) {
        setCurrentQuestionIndex(idx);
      }
    }
    setErrors({});
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 600));
    localStorage.setItem(DRAFT_KEY(patientId), JSON.stringify(answers));
    setIsSaving(false);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 800));

    // Build structured result
    const quickdashSection = sections.find(s => s.scoreCalculation === 'quickdash');
    const quickdashScore = quickdashSection
      ? calculateQuickDASH(answers, quickdashSection.questions)
      : null;

    const totalScore = sections.reduce((acc, s) => {
      return acc + s.questions.reduce((qacc, q) => {
        if (q.scoreValues && answers[q.id] !== undefined && answers[q.id] !== null) {
          return qacc + (q.scoreValues[answers[q.id]] || 0);
        }
        return qacc;
      }, 0);
    }, 0);

    const maxScore = sections.reduce((acc, s) => {
      return acc + s.questions.reduce((qacc, q) => {
        if (q.scoreValues) return qacc + Math.max(...q.scoreValues);
        return qacc;
      }, 0);
    }, 0);

    const assessment = {
      id: `a${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: isFollowUp ? 'Follow-Up' : 'Pre-Visit',
      score: totalScore,
      maxScore,
      quickdashScore,
      bodyArea: patient?.bodyArea,
      completedBy: 'Nurse Sara',
      chiefComplaint,
      answers,
      sections: config.title
    };

    if (onAddAssessment) onAddAssessment(patientId, assessment);
    if (onUpdateStatus) onUpdateStatus(patientId, 'assessment-completed');

    // Clear draft
    localStorage.removeItem(DRAFT_KEY(patientId));

    setIsSubmitting(false);
    setSubmitted(true);
  };

  // ── No patient guard ─────────────────────────────────────────────────────────
  if (!patient) {
    return (
      <>
        <div className="topbar">
          <div className="topbar-left">
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
              <ArrowLeft size={18} />
            </button>
            <h1>Assessment</h1>
          </div>
        </div>
        <div className="page-body">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>No patient selected. Return to the dashboard first.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
              Go to Dashboard
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Submitted screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <>
        <div className="topbar">
          <div className="topbar-left"><h1>Assessment Completed</h1></div>
        </div>
        <div className="page-body">
          <div className="card" style={{ textAlign: 'center', padding: '64px 48px', maxWidth: 560, margin: '0 auto' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle2 size={40} color="var(--primary)" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Assessment Submitted</h2>
            <p className="text-muted" style={{ marginBottom: 24 }}>
              {isFollowUp ? 'Follow-up' : 'Pre-visit'} assessment for <strong>{patient.name}</strong> has been saved.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate(`/patient/${patient.id}`)}>
                View Profile
              </button>
              <button className="btn btn-outline" onClick={() => navigate('/')}>
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <>
      {/* Top Bar */}
      <div className="topbar">
        <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1>{isFollowUp ? 'Follow-Up' : 'Pre-Visit'} Assessment</h1>
            <p>{patient.name} · {patient.mrn}</p>
          </div>
        </div>
        {saveFlash && (
          <div className="topbar-right">
            <div className="save-flash">
              <CheckCircle2 size={14} /> Draft saved
            </div>
          </div>
        )}
      </div>

      <div className="page-body" style={{ padding: '20px 24px' }}>
        {/* Top Info Cards */}
        <div className="intake-top-cards">
          <PatientSummaryCard patient={patient} />
          <VisitSummaryCard
            patient={patient}
            isFollowUp={isFollowUp}
            chiefComplaint={chiefComplaint}
            onChangeComplaint={setChiefComplaint}
          />
        </div>

        {/* Assessment Header */}
        <AssessmentHeader
          config={config}
          overallProgress={overallProgress}
          totalQuestions={totalQuestions}
          answeredQuestions={answeredQuestions}
        />

        {/* Main Two-Column Layout */}
        <div className="intake-workspace">
          {/* Left Sidebar */}
          <AssessmentSidebar
            sections={sections}
            currentSectionId={showSummary ? '__summary__' : currentSectionId}
            answers={answers}
            onSelectSection={handleSelectSection}
          />

          {/* Right Panel */}
          <div className="intake-main">
            {showSummary ? (
              <SummaryPage
                config={config}
                answers={answers}
                patient={patient}
                isFollowUp={isFollowUp}
                onBack={handlePrev}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            ) : (
              <>
                {/* Section header */}
                <div className="intake-section-header">
                  <div>
                    <div className="intake-section-title">{currentSection?.title}</div>
                    {currentSection?.description && (
                      <div className="intake-section-desc">{currentSection.description}</div>
                    )}
                  </div>
                  <div className="intake-section-progress">
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                  </div>
                </div>

                {/* Questions */}
                <div className="intake-questions">
                  {currentQuestion && (
                    <QuestionRenderer
                      key={currentQuestion.id}
                      question={currentQuestion}
                      sectionIdx={currentSectionIndex}
                      questionIdx={currentQuestionIndex}
                      totalSectionQuestions={totalQuestions}
                      value={answers[currentQuestion.id]}
                      onChange={(val) => handleAnswer(currentQuestion.id, val)}
                      error={errors[currentQuestion.id]}
                    />
                  )}
                </div>

                {/* Navigation */}
                <AssessmentNavigation
                  canGoPrev={currentQuestionIndex > 0}
                  canGoNext={true}
                  isLastSection={isLastQuestion}
                  isSaving={isSaving}
                  hasErrors={hasErrors}
                  onPrev={handlePrev}
                  onNext={handleNext}
                  onSaveDraft={handleSaveDraft}
                  onSubmit={() => {
                    if (validateQuestion(currentQuestion)) {
                      setShowSummary(true);
                    }
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
