import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../api';
import { computeFinalScore } from '../utils/scoring';
import QuestionRenderer from '../components/assessment/QuestionRenderer';

/** Public, no-login page opened from the QR code / link a doctor generates
 * in "Select & Assign PROM" (patient self-completion). Deliberately kept
 * separate from the staff-facing PreVisitAssessment flow — no patient chart,
 * no sidebar, nothing but the questionnaire itself. See
 * backend/routers/prom_public.py for the two endpoints this calls. */
export default function PromPublicFill() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get(`/api/public/prom-assignments/${token}`)
      .then((res) => setState({ loading: false, error: null, data: res.data }))
      .catch((err) => setState({
        loading: false,
        error: err.response?.status === 410 ? 'already_done' : 'invalid',
        data: null,
      }));
  }, [token]);

  const questions = useMemo(() => (state.data?.config?.sections || []).flatMap((s) => s.questions), [state.data]);
  const current = questions[index];
  const total = questions.length;
  const progress = total > 0 ? Math.round(((index) / total) * 100) : 0;

  const handleAnswer = (value) => {
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
    setErrors((prev) => ({ ...prev, [current.id]: null }));
  };

  const validate = () => {
    if (!current?.required) return true;
    const a = answers[current.id];
    const empty = a === undefined || a === null || a === '' || (Array.isArray(a) && a.length === 0);
    if (empty) { setErrors((prev) => ({ ...prev, [current.id]: 'Please answer this question.' })); return false; }
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    if (index < total - 1) { setIndex((i) => i + 1); return; }
    handleSubmit();
  };

  const handleSubmit = () => {
    setSubmitting(true);
    const result = computeFinalScore(state.data.config, answers);
    api.post(`/api/public/prom-assignments/${token}/submit`, {
      score: result?.raw ?? 0,
      maxScore: result?.rawMax ?? 0,
      finalScore: result?.final ?? null,
      interpretation: result?.interpretation ?? null,
      promCode: result?.promCode ?? null,
      answers,
    })
      .then(() => setDone(true))
      .catch(() => setState((s) => ({ ...s, error: 'submit_failed' })))
      .finally(() => setSubmitting(false));
  };

  if (state.loading) {
    return (
      <div className="prom-public-page">
        <div className="prom-public-card"><p className="text-muted">Loading questionnaire…</p></div>
      </div>
    );
  }

  if (state.error === 'invalid') {
    return (
      <div className="prom-public-page">
        <div className="prom-public-card prom-public-status">
          <AlertCircle size={40} color="var(--danger)" />
          <h2>Link Not Found</h2>
          <p className="text-muted">This link isn&rsquo;t valid. Please contact the clinic for a new one.</p>
        </div>
      </div>
    );
  }

  if (state.error === 'already_done' || done) {
    return (
      <div className="prom-public-page">
        <div className="prom-public-card prom-public-status">
          <CheckCircle2 size={40} color="var(--success)" />
          <h2>Thank You</h2>
          <p className="text-muted">Your answers have been recorded and sent to your care team.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="prom-public-page">
      <div className="prom-public-card">
        <div className="prom-public-header">
          <div className="prom-public-brand"><Activity size={18} /> OPD AI Unit</div>
          <h2>Hi {state.data.patientFirstName}, a quick check-in</h2>
          <p className="text-muted">{state.data.promName || state.data.config.title} — answer based on how you&rsquo;ve felt this past week.</p>
        </div>

        <div className="asmh-progress-bar" style={{ margin: '4px 0 18px' }}>
          <div className="asmh-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {current && (
          <QuestionRenderer
            key={current.id}
            question={current}
            sectionIdx={0}
            questionIdx={index}
            totalSectionQuestions={total}
            value={answers[current.id]}
            onChange={handleAnswer}
            error={errors[current.id]}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
          <button className="btn btn-outline" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
            Back
          </button>
          <button className="btn btn-primary" onClick={handleNext} disabled={submitting}>
            {submitting ? 'Submitting…' : index === total - 1 ? 'Submit' : 'Next'}
          </button>
        </div>

        {state.error === 'submit_failed' && (
          <p style={{ color: 'var(--danger)', fontSize: 12.5, marginTop: 10 }}>Something went wrong submitting your answers — please try again.</p>
        )}
      </div>
    </div>
  );
}
