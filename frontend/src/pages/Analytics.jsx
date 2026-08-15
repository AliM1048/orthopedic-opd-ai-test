import { useMemo } from 'react';
import { Users, ClipboardCheck, Stethoscope, TrendingUp } from 'lucide-react';
import { useLookup } from '../hooks/useLookupData';
import { useTheme } from '../hooks/useTheme';

// Validated categorical ramp (dataviz skill reference palette) — adjacent
// pairs clear CVD ΔE >= 8 and normal-vision ΔE >= 15 in both modes. Bars are
// always paired with a direct text label, satisfying the "relief rule" for
// the slots that dip below 3:1 contrast on their own.
const CATEGORICAL = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#4a3aa7'],
  dark:  ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9'],
};
const OTHER_COLOR = { light: '#7a9a9e', dark: '#5f8a8f' };
const MAX_CATEGORICAL_SLOTS = 6;

// Assessment.promCode values whose native scoring direction is 0=best/100=worst
// (see backend/seed_proms.py scoreDirection: 'lower_better').
const LOWER_BETTER_PROM_CODES = new Set(['quickdash', 'odi_ndi']);

function colorForIndex(idx, theme, isOther) {
  if (isOther) return OTHER_COLOR[theme];
  return CATEGORICAL[theme][idx % CATEGORICAL[theme].length];
}

// Tally `items` by `keyFn`, in first-seen order, folding anything past
// MAX_CATEGORICAL_SLOTS into a trailing "Other" bucket.
function tally(items, keyFn) {
  const counts = new Map();
  items.forEach((item) => {
    const key = keyFn(item);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (entries.length <= MAX_CATEGORICAL_SLOTS) return entries;
  const head = entries.slice(0, MAX_CATEGORICAL_SLOTS - 1);
  const tailCount = entries.slice(MAX_CATEGORICAL_SLOTS - 1).reduce((sum, [, c]) => sum + c, 0);
  return [...head, ['Other', tailCount]];
}

function HBar({ rows, unit = '' }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="an-hbar-list">
      {rows.map((r) => (
        <div className="an-hbar-row" key={r.id}>
          <div className="an-hbar-label">{r.label}</div>
          <div className="an-hbar-track">
            <div
              className="an-hbar-fill"
              style={{ width: `${Math.max(3, (r.value / max) * 100)}%`, background: r.color }}
              tabIndex={0}
              role="img"
              aria-label={`${r.label}: ${r.value}${unit}`}
              title={`${r.label}: ${r.value}${unit}`}
            />
          </div>
          <div className="an-hbar-value">{r.value}{unit}</div>
        </div>
      ))}
    </div>
  );
}

function VBar({ cols, unit = '' }) {
  const max = Math.max(1, ...cols.map((c) => c.value));
  const labelAll = cols.length <= 8;
  return (
    <div className="an-vbar-chart">
      <div className="an-vbar-plot">
        {cols.map((c, i) => (
          <div className="an-vbar-col" key={c.id}>
            <div className="an-vbar-value">
              {(labelAll || c.value === max || i === cols.length - 1) ? `${c.value}${unit}` : ''}
            </div>
            <div
              className="an-vbar-bar"
              style={{ height: `${Math.max(2, (c.value / max) * 100)}%`, background: c.color }}
              tabIndex={0}
              role="img"
              aria-label={`${c.label}: ${c.value}${unit}`}
              title={`${c.label}: ${c.value}${unit}`}
            />
            <div className="an-vbar-label">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, empty, children }) {
  return (
    <div className="card an-chart-card">
      <div className="card-header">
        <div>
          <div className="card-title">{title}</div>
          {subtitle && <div className="card-subtitle">{subtitle}</div>}
        </div>
      </div>
      {empty ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <p>Not enough data yet.</p>
        </div>
      ) : children}
    </div>
  );
}

export default function Analytics({ patients }) {
  const { statusConfig } = useLookup();
  const { theme } = useTheme();

  const stats = useMemo(() => ({
    total: patients.length,
    assessed: patients.filter((p) => (p.assessments?.length || 0) > 0).length,
    evaluated: patients.filter((p) => (p.evaluations?.length || 0) > 0).length,
  }), [patients]);

  const avgPromOverall = useMemo(() => {
    const scored = patients.flatMap((p) => p.assessments || []).filter((a) => a.maxScore > 0);
    if (!scored.length) return null;
    const pct = scored.reduce((sum, a) => sum + (a.score / a.maxScore) * 100, 0) / scored.length;
    return Math.round(pct);
  }, [patients]);

  const statusRows = useMemo(() => {
    const counts = new Map();
    patients.forEach((p) => counts.set(p.status, (counts.get(p.status) || 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([status, value]) => {
        const cfg = statusConfig[status];
        return { id: status, label: cfg?.label || status, value, color: cfg?.color || 'var(--text-muted)' };
      });
  }, [patients, statusConfig]);

  const bodyAreaColorMap = useMemo(() => {
    const areas = tally(patients, (p) => p.bodyArea).map(([area]) => area);
    const map = new Map();
    areas.forEach((area, i) => map.set(area, colorForIndex(i, theme, area === 'Other')));
    return map;
  }, [patients, theme]);

  const bodyAreaRows = useMemo(() => {
    const entries = tally(patients, (p) => p.bodyArea);
    return entries.map(([area, value]) => ({ id: area, label: area, value, color: bodyAreaColorMap.get(area) }));
  }, [patients, bodyAreaColorMap]);

  const visitVolumeCols = useMemo(() => {
    const counts = new Map();
    patients.forEach((p) => { if (p.appointmentDate) counts.set(p.appointmentDate, (counts.get(p.appointmentDate) || 0) + 1); });
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, value]) => ({
        id: date,
        label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value,
        color: 'var(--primary)',
      }));
  }, [patients]);

  const avgPromByAreaCols = useMemo(() => {
    // Normalizes every region to a "wellness" score (100 = best) for
    // cross-region comparability here, even though several instruments are
    // natively lower_better (0=best/100=worst — QuickDASH/ODI/NDI), so those
    // get inverted for this chart only — a deliberate exception to
    // per-assessment clinical fidelity, which the Physician Evaluation page
    // preserves exactly (native direction + a "higher = ..." caption).
    const byArea = new Map();
    patients.forEach((p) => {
      (p.assessments || []).forEach((a) => {
        if (!a.maxScore) return;
        const raw = a.finalScore ?? Math.round((a.score / a.maxScore) * 100);
        const pct = LOWER_BETTER_PROM_CODES.has(a.promCode) ? 100 - raw : raw;
        const area = a.bodyArea || p.bodyArea;
        if (!byArea.has(area)) byArea.set(area, []);
        byArea.get(area).push(pct);
      });
    });
    return [...byArea.entries()].map(([area, vals]) => ({
      id: area,
      label: area,
      value: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
      color: bodyAreaColorMap.get(area) || colorForIndex(0, theme, false),
    }));
  }, [patients, bodyAreaColorMap, theme]);

  const painDistributionCols = useMemo(() => {
    const bins = new Array(11).fill(0);
    let any = false;
    patients.forEach((p) => {
      (p.assessments || []).forEach((a) => {
        const raw = a.answers?.pain_scale;
        const val = typeof raw === 'string' ? parseInt(raw, 10) : raw;
        if (Number.isFinite(val) && val >= 0 && val <= 10) { bins[val] += 1; any = true; }
      });
    });
    if (!any) return [];
    return bins.map((value, level) => ({ id: level, label: String(level), value, color: 'var(--danger)' }));
  }, [patients]);

  const diagnosisRows = useMemo(() => {
    const evals = patients.flatMap((p) => p.evaluations || []);
    return tally(evals.filter((e) => e.diagnosis?.trim()), (e) => e.diagnosis.trim())
      .slice(0, 8)
      .map(([label, value]) => ({ id: label, label, value, color: 'var(--info)' }));
  }, [patients]);

  const treatmentRows = useMemo(() => {
    const treatments = patients.flatMap((p) => p.treatments || []);
    return tally(treatments, (t) => t.type)
      .slice(0, 8)
      .map(([label, value]) => ({ id: label, label, value, color: 'var(--accent)' }));
  }, [patients]);

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <h1>Analytics</h1>
          <p>Clinic overview and clinical outcome trends across all patients</p>
        </div>
      </div>

      <div className="page-body">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon blue"><Users size={24} /></div>
            <div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Patients</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple"><ClipboardCheck size={24} /></div>
            <div>
              <div className="stat-value">{stats.assessed}</div>
              <div className="stat-label">Nurse Assessments Done</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><Stethoscope size={24} /></div>
            <div>
              <div className="stat-value">{stats.evaluated}</div>
              <div className="stat-label">Doctor Evaluations Done</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow"><TrendingUp size={24} /></div>
            <div>
              <div className="stat-value">{avgPromOverall !== null ? `${avgPromOverall}%` : '—'}</div>
              <div className="stat-label">Avg. PROM Score</div>
            </div>
          </div>
        </div>

        <h2 className="an-section-title">Patient &amp; Clinic Overview</h2>
        <div className="an-chart-grid">
          <ChartCard title="Status breakdown" subtitle="Where every patient sits in the visit workflow" empty={!statusRows.length}>
            <HBar rows={statusRows} />
          </ChartCard>
          <ChartCard title="Body area distribution" subtitle="Cases by anatomical region" empty={!bodyAreaRows.length}>
            <HBar rows={bodyAreaRows} />
          </ChartCard>
          <ChartCard title="Visit volume" subtitle="Appointments per day (most recent)" empty={!visitVolumeCols.length}>
            <VBar cols={visitVolumeCols} />
          </ChartCard>
        </div>

        <h2 className="an-section-title">Clinical Outcome Trends</h2>
        <div className="an-chart-grid">
          <ChartCard title="Avg. PROM score by body area" subtitle="Higher = better function on the 0–100 scale" empty={!avgPromByAreaCols.length}>
            <VBar cols={avgPromByAreaCols} unit="%" />
          </ChartCard>
          <ChartCard title="Pain score distribution" subtitle="Self-reported pain, 0 (none) to 10 (worst)" empty={!painDistributionCols.length}>
            <VBar cols={painDistributionCols} />
          </ChartCard>
          <ChartCard title="Top diagnoses" subtitle="Most frequent physician diagnoses" empty={!diagnosisRows.length}>
            <HBar rows={diagnosisRows} />
          </ChartCard>
          <ChartCard title="Top treatments" subtitle="Most frequently ordered treatment types" empty={!treatmentRows.length}>
            <HBar rows={treatmentRows} />
          </ChartCard>
        </div>
      </div>
    </>
  );
}
