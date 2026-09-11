import { useEffect, useState } from 'react';
import { Plus, Scissors, Syringe, Activity as ActivityIcon, AlertTriangle } from 'lucide-react';
import api from '../api';
import { useLanguage } from '../hooks/useLanguage';

const EVENT_META = {
  surgery:        { icon: Scissors,     color: 'var(--danger)' },
  injection:      { icon: Syringe,      color: 'var(--info)' },
  physiotherapy:  { icon: ActivityIcon, color: 'var(--success)' },
  new_injury:     { icon: AlertTriangle, color: 'var(--warning)' },
};

const CHART_W = 560;
const CHART_H = 130;
const PAD_L = 34;
const PAD_R = 16;
const PAD_T = 18;
const PAD_B = 26;

/** PROM outcome trend — Baseline/6wk/3m/6m/12m/2y/5y on the x-axis (fixed
 * clinical timepoints, not raw visit dates), with vertical markers for
 * Surgery/Injection/Start Physiotherapy/New Injury. A timepoint with no
 * assessment close enough to it renders as "Missing" — see
 * backend/routers/prom_trend.py, which never fabricates a value. */
export default function PromTrendChart({ patientId, scoreDirection: fallbackDirection }) {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddInjury, setShowAddInjury] = useState(false);
  const [injuryDate, setInjuryDate] = useState('');

  const reload = () => {
    api.get(`/api/patients/${patientId}/prom-trend`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [patientId]);

  const handleAddInjury = () => {
    if (!injuryDate) return;
    api.post(`/api/patients/${patientId}/injury-events`, { date: injuryDate })
      .then(() => { setShowAddInjury(false); setInjuryDate(''); reload(); })
      .catch(() => {});
  };

  if (loading) return <p className="pe-empty-note">{t('components.promTrendChart.loadingTrend')}</p>;

  const points = data?.points || [];
  const known = points.filter((p) => p.score !== null);
  if (known.length === 0) {
    return (
      <div>
        <p className="pe-empty-note">{t('components.promTrendChart.notEnoughHistory')}</p>
      </div>
    );
  }

  const direction = data?.scoreDirection || fallbackDirection || 'higher_better';
  const improvement = data?.improvement;
  const improving = improvement === null || improvement === undefined
    ? null
    : direction === 'lower_better' ? improvement <= 0 : improvement >= 0;

  const maxOffset = points[points.length - 1].dayOffset || 1;
  const plotW = CHART_W - PAD_L - PAD_R;
  const step = points.length > 1 ? plotW / (points.length - 1) : 0;
  // Milestones are fixed clinical timepoints, not evenly spaced in real days
  // (Baseline=0, 6 Weeks=42, 3 Months=90 vs. 2 Years->5 Years=1095 days
  // apart) — a linear day-offset scale crushed the early labels together
  // into an overlapping mess. Space milestones evenly by index instead so
  // every x-axis label gets equal room, and interpolate anything in between
  // (event markers) piecewise between its two neighboring milestones so it
  // still lands at roughly the right relative position in time.
  const xScale = (offset) => {
    const clamped = Math.max(0, Math.min(offset, maxOffset));
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i].dayOffset;
      const b = points[i + 1].dayOffset;
      if (clamped <= b || i === points.length - 2) {
        const frac = b > a ? (clamped - a) / (b - a) : 0;
        return PAD_L + (i + frac) * step;
      }
    }
    return PAD_L;
  };
  const yScale = (score) => PAD_T + (1 - score / 100) * (CHART_H - PAD_T - PAD_B);

  const linePath = known
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.dayOffset)} ${yScale(p.score)}`)
    .join(' ');

  return (
    <div>
      {improvement !== null && improvement !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('components.promTrendChart.changeFromBaseline')}</span>
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
            background: improving ? 'var(--success-light)' : 'var(--danger-light)',
            color: improving ? 'var(--success)' : 'var(--danger)',
          }}>
            {improvement >= 0 ? `▲ +${improvement}` : `▼ ${improvement}`}
          </span>
        </div>
      )}

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg width={CHART_W} height={CHART_H + 34} viewBox={`0 0 ${CHART_W} ${CHART_H + 34}`}>
          {/* gridlines */}
          {[0, 25, 50, 75, 100].map((v) => (
            <line key={v} x1={PAD_L} x2={CHART_W - PAD_R} y1={yScale(v)} y2={yScale(v)} stroke="var(--border)" strokeWidth="1" />
          ))}

          {/* event markers */}
          {(data.events || []).map((ev, i) => {
            const meta = EVENT_META[ev.type] || EVENT_META.new_injury;
            const x = xScale(Math.max(0, Math.min(ev.dayOffset, maxOffset)));
            return (
              <g key={i}>
                <line x1={x} x2={x} y1={PAD_T} y2={CHART_H - PAD_B} stroke={meta.color} strokeWidth="1.5" strokeDasharray="3,3" opacity="0.7" />
              </g>
            );
          })}

          {/* trend line */}
          <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />

          {/* points + x labels */}
          {points.map((p, i) => {
            const x = xScale(p.dayOffset);
            return (
              <g key={i}>
                {p.score !== null ? (
                  <circle cx={x} cy={yScale(p.score)} r="4" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2.5" />
                ) : (
                  <circle cx={x} cy={CHART_H - PAD_B - 4} r="2.5" fill="var(--border-dark)" />
                )}
                <text x={x} y={CHART_H + 16} fontSize="9.5" fill="var(--text-muted)" textAnchor="middle">{p.label}</text>
                {p.score === null && <text x={x} y={CHART_H + 27} fontSize="8.5" fill="var(--text-muted)" textAnchor="middle" fontStyle="italic">{t('components.promTrendChart.missing')}</text>}
              </g>
            );
          })}
        </svg>
      </div>

      {(data.events || []).length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
          {data.events.map((ev, i) => {
            const meta = EVENT_META[ev.type] || EVENT_META.new_injury;
            const Icon = meta.icon;
            return (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--text-muted)' }}>
                <Icon size={11} style={{ color: meta.color }} /> {ev.label} ({ev.date})
              </span>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        {showAddInjury ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="date" className="form-control" style={{ maxWidth: 160, padding: '5px 8px', fontSize: 12 }} value={injuryDate} onChange={(e) => setInjuryDate(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={handleAddInjury} disabled={!injuryDate}>{t('components.promTrendChart.save')}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAddInjury(false)}>{t('components.promTrendChart.cancel')}</button>
          </div>
        ) : (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAddInjury(true)}>
            <Plus size={13} /> {t('components.promTrendChart.logNewInjury')}
          </button>
        )}
      </div>
    </div>
  );
}
