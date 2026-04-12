import assert from 'node:assert/strict';
import test from 'node:test';

import { ventures, weightSets } from '@/lib/seed-data';
import { calculateCombinedPriority, rankVentures } from '@/lib/scoring';

test('rankVentures orders ventures by combined score descending', () => {
  const ranked = rankVentures(ventures, weightSets[0]);

  assert.ok(ranked.length >= 3);
  assert.ok(ranked[0].combinedScore >= ranked[1].combinedScore);
  assert.ok(ranked[1].combinedScore >= ranked[2].combinedScore);
});

test('calculateCombinedPriority returns normalized scores', () => {
  const result = calculateCombinedPriority(ventures[0], weightSets[0]);

  assert.ok(result.ventureScore > 0 && result.ventureScore <= 100);
  assert.ok(result.freedomScore > 0 && result.freedomScore <= 100);
  assert.ok(result.combinedScore > 0 && result.combinedScore <= 100);
});
