import type { AiProfileInfo } from '../types/ai-analyze.types.js';
import type { NormalizedProductV2 } from '../types/normalized-product.types.js';
import type { ProfileInputForScoring } from '../types/scoring.types.js';
import { calculateSafetyScore } from './calculate-safety-score.util.js';

const baseProfile: ProfileInputForScoring = {
  profileId: 'profile-1',
  profileType: 'user',
  displayName: 'You',
  mainGoal: null,
  restrictions: ['DAIRY_FREE'],
  allergies: [],
  otherAllergiesText: null,
};

const baseProduct: NormalizedProductV2 = {
  barcode: '12345678',
  name: 'Test product',
  brand: null,
  imageUrl: null,
  ingredients: ['sugar'],
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

const baseAiProfileInfo: AiProfileInfo = {
  profileType: 'user',
  profileId: 'profile-1',
  displayName: 'You',
  allergenDetections: [],
  restrictionDetections: [],
  traceDetections: [],
  ingredients: [],
  overallSummary: null,
  canIHaveThis: {
    can: true,
    reason: 'Yes – check trace warnings first.',
  },
  uncertaintyFlags: [],
};

describe('calculateSafetyScore trace detections', () => {
  it('scores selected restriction traces as caution without violatedRestrictions', () => {
    const result = calculateSafetyScore(baseProfile, baseProduct, {
      ...baseAiProfileInfo,
      traceDetections: [
        {
          trace: 'milk',
          allergy: null,
          restriction: 'DAIRY_FREE',
          source: 'off_trace_tag',
          confidence: 1,
          evidence: ['Product traces list milk.'],
        },
      ],
    });

    expect(result.status).toBe('caution');
    expect(result.score).toBe(40);
    expect(result.traceRestrictions).toEqual(['DAIRY_FREE']);
    expect(result.violatedRestrictions).toEqual([]);
    expect(result.reasons).toContain('Trace risk for dairy free restriction: milk');
  });

  it('keeps direct ingredient restriction violations separate from traces', () => {
    const result = calculateSafetyScore(baseProfile, baseProduct, {
      ...baseAiProfileInfo,
      restrictionDetections: [
        {
          restriction: 'DAIRY_FREE',
          status: 'not_compatible',
          compatible: false,
          source: 'ingredient_text',
          confidence: 1,
          ingredients: ['milk powder'],
          evidence: ['Milk powder is listed as an ingredient.'],
        },
      ],
    });

    expect(result.status).toBe('avoid');
    expect(result.score).toBe(0);
    expect(result.violatedRestrictions).toEqual(['DAIRY_FREE']);
    expect(result.traceRestrictions).toEqual([]);
  });

  it('tracks allergy traces separately from confirmed matched allergens', () => {
    const result = calculateSafetyScore(
      { ...baseProfile, restrictions: [], allergies: ['DAIRY'] },
      baseProduct,
      {
        ...baseAiProfileInfo,
        traceDetections: [
          {
            trace: 'milk',
            allergy: 'DAIRY',
            restriction: null,
            source: 'off_trace_tag',
            confidence: 1,
            evidence: ['Product traces list milk.'],
          },
        ],
      },
    );

    expect(result.status).toBe('caution');
    expect(result.matchedAllergens).toEqual([]);
    expect(result.traceAllergens).toEqual(['DAIRY']);
  });
});
