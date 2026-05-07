import type { ScoreReason } from '@acme/shared';
import type { AiProfileInfo } from '../types/ai-analyze.types.js';
import type { NormalizedProductV2 } from '../types/normalized-product.types.js';
import type { SafetyResult } from '../types/scoring.types.js';
import { addSafetyReasons } from './build-safety-score-reasons.util.js';

const product: NormalizedProductV2 = {
  barcode: '12345678',
  name: 'Trace product',
  brand: null,
  imageUrl: null,
  ingredients: [],
  allergens: [],
  traces: ['milk'],
  additives: [],
  categories: [],
  servingSizeText: null,
  servingSizeGrams: null,
  servingSizeMl: null,
  nutrition: {
    caloriesPer100g: null,
    caloriesPerServing: null,
    proteinPer100g: null,
    carbsPer100g: null,
    sugarPer100g: null,
    fatPer100g: null,
    saturatedFatPer100g: null,
    fiberPer100g: null,
    sodiumPer100g: null,
    saltPer100g: null,
  },
};

const safety: SafetyResult = {
  score: 40,
  status: 'caution',
  reasons: ['Trace risk for dairy free restriction: milk'],
  matchedAllergens: [],
  violatedRestrictions: [],
  traceAllergens: [],
  traceRestrictions: [],
};

const aiProfileInfo: AiProfileInfo = {
  profileType: 'user',
  profileId: 'profile-1',
  displayName: 'You',
  allergenDetections: [],
  restrictionDetections: [],
  traceDetections: [
    {
      trace: 'milk',
      allergy: '.',
      restriction: 'DAIRY_FREE',
      source: 'off_trace_tag',
      confidence: 1,
      evidence: ['Product traces list milk.'],
    },
  ],
  ingredients: [],
  overallSummary: null,
  canIHaveThis: {
    can: true,
    reason: 'Yes – dairy trace is present, so check carefully.',
  },
  uncertaintyFlags: [],
};

describe('addSafetyReasons trace detections', () => {
  it('ignores invalid trace allergy values while keeping valid trace restrictions', () => {
    const negatives = new Map<string, ScoreReason>();

    addSafetyReasons(product, safety, aiProfileInfo, negatives);

    const reasons = Array.from(negatives.values());
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toMatchObject({
      key: 'diet-matching',
      label: 'Dairy-free',
      description: 'Trace risk for dairy-free restriction: milk',
    });
    expect(reasons.some((reason) => reason.label === '.')).toBe(false);
  });
});
