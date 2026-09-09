import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFinalScore } from './scoring.js';

test('ODI/NDI scoring returns a percentage and disability interpretation', () => {
  const questions = Array.from({ length: 10 }, (_, i) => ({
    id: `q${i + 1}`,
    scoreValues: [0, 1, 2, 3, 4, 5],
  }));

  const config = {
    scoreCalculation: 'odi_ndi',
    scoreDirection: 'lower_better',
    promName: 'ODI',
    sections: [{ questions }],
  };

  const answers = {
    q1: 2,
    q2: 1,
    q3: 3,
    q4: 2,
    q5: 1,
    q6: 2,
    q7: 1,
    q8: 0,
    q9: 2,
    q10: 1,
  };

  const result = computeFinalScore(config, answers);

  assert.equal(result.final, 30);
  assert.equal(result.interpretation?.label, 'Moderate disability');
  assert.equal(result.interpretation?.severity, 'moderate');
});
