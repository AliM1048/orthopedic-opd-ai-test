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

// ─── Standardized PROM scoring (KOOS-JR / HOOS-JR / QuickDASH / ODI / NDI / SEFAS) ──

export function getOdiNdiInterpretation(score) {
  if (score === null || score === undefined) return null;
  if (score <= 20) {
    return { label: 'Minimal disability', severity: 'mild', range: '0–20%' };
  }
  if (score <= 40) {
    return { label: 'Moderate disability', severity: 'moderate', range: '21–40%' };
  }
  if (score <= 60) {
    return { label: 'Severe disability', severity: 'severe', range: '41–60%' };
  }
  if (score <= 80) {
    return { label: 'Crippled', severity: 'very_severe', range: '61–80%' };
  }
  return { label: 'Bed-bound or symptom exaggeration', severity: 'critical', range: '81–100%' };
}

// ODI / NDI: (total / (answered * 5)) * 100 — 0 = best (no disability), 100 = worst.
export function calculatePercentOfMax(answers, questions) {
  const scoredQs = questions.filter(q => q.scoreValues);
  if (!scoredQs.length) return null;
  const answered = scoredQs.filter(q => answers[q.id] !== undefined && answers[q.id] !== null);
  if (!answered.length) return null;
  const total = answered.reduce((acc, q) => acc + (q.scoreValues[answers[q.id]] || 0), 0);
  return Math.round((total / (answered.length * 5)) * 1000) / 10;
}

// SEFAS: (raw / rawMax) * 100 — item scoreValues are already oriented so
// higher raw = better function, matching SEFAS's 0=worst/100=best convention.
export function calculateRawPercent(raw, rawMax) {
  if (!rawMax) return null;
  return Math.round((raw / rawMax) * 100);
}

// KOOS-JR / HOOS-JR: official scoring uses a validated non-linear raw->interval
// conversion table, which we don't have (see backend/seed_proms.py). Falls back
// to a linear approximation that preserves the correct direction (item
// scoreValues are oriented so higher raw = more problems; final score inverts
// that to 0=worst/100=best) until the real table is supplied via `conversionTable`.
export function calculateKoosHoosJr(raw, rawMax, conversionTable) {
  if (!rawMax) return null;
  if (Array.isArray(conversionTable) && conversionTable.length) {
    let closest = conversionTable[0];
    for (const row of conversionTable) {
      if (Math.abs(row.raw - raw) < Math.abs(closest.raw - raw)) closest = row;
    }
    return Math.round(closest.interval);
  }
  return Math.round(100 - (raw / rawMax) * 100);
}

// Dispatches to the right formula based on the assessment config's
// top-level `scoreCalculation` (DB-driven — see AssessmentConfig.scoreCalculation).
// Sections are treated as UX chunking only here, not scoring boundaries: every
// scored question across every section counts toward one instrument total.
export function computeFinalScore(config, answers) {
  if (!config || !answers) return null;
  const questions = (config.sections || []).flatMap(s => s.questions);
  const scored = questions.filter(q => q.scoreValues);
  if (!scored.length) return null;
  const answered = scored.filter(q => answers[q.id] !== undefined && answers[q.id] !== null);
  if (!answered.length) return null;

  const raw = answered.reduce((acc, q) => acc + (q.scoreValues[answers[q.id]] || 0), 0);
  const rawMax = config.scoreCalculation === 'odi_ndi'
    ? answered.length * 5
    : (config.rawMax ?? scored.reduce((acc, q) => acc + Math.max(...q.scoreValues), 0));

  let final;
  switch (config.scoreCalculation) {
    case 'quickdash':
      final = calculateQuickDASH(answers, questions);
      break;
    case 'odi_ndi':
      final = calculatePercentOfMax(answers, questions);
      break;
    case 'sefas':
      final = calculateRawPercent(raw, rawMax);
      break;
    case 'koos_hoos_jr':
      final = calculateKoosHoosJr(raw, rawMax, config.conversionTable);
      break;
    default:
      final = rawMax ? Math.round((raw / rawMax) * 100) : null;
  }

  const interpretation = config.scoreCalculation === 'odi_ndi'
    ? getOdiNdiInterpretation(final)
    : null;

  return {
    raw, rawMax, final,
    direction: config.scoreDirection || 'higher_better',
    promCode: config.scoreCalculation || 'generic',
    promName: config.promName || config.title,
    interpretation,
  };
}
