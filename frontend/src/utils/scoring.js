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
