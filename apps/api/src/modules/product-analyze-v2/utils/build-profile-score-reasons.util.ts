import type { ScoreReason } from '@acme/shared';
import type { AiProfileInfo } from '../types/ai-analyze.types.js';
import type { NormalizedProductV2 } from '../types/normalized-product.types.js';
import type { ProductRole } from '../types/product-role.types.js';
import type { SafetyResult } from '../types/scoring.types.js';
import { buildNutritionDisplayReasons } from './build-nutrition-display-reasons.util.js';
import { addSafetyReasons } from './build-safety-score-reasons.util.js';
interface BuildProfileScoreReasonsInput {
  product: NormalizedProductV2;
  role: ProductRole;
  safety: SafetyResult;
  aiProfileInfo?: AiProfileInfo | null;
}
interface ScoreReasonBuckets {
  positives: ScoreReason[];
  negatives: ScoreReason[];
}

interface CreateReasonInput {
  key: string;
  label: string;
  description: string;
  value: number | null;
  unit: string | null;
  impact: number;
  kind: ScoreReason['kind'];
  source: ScoreReason['source'];
  category?: ScoreReason['category'];
}
const addReason = (
  bucket: Map<string, ScoreReason>,
  reason: ScoreReason,
  dedupeKey = reason.key,
): void => {
  if (!bucket.has(dedupeKey)) {
    bucket.set(dedupeKey, reason);
  }
};
const createReason = (input: CreateReasonInput): ScoreReason => ({
  key: input.key,
  label: input.label,
  description: input.description,
  value: input.value,
  unit: input.unit,
  impact: input.impact,
  kind: input.kind,
  source: input.source,
  category: input.category,
});

const addNutritionReasons = (
  product: NormalizedProductV2,
  role: ProductRole,
  positives: Map<string, ScoreReason>,
  negatives: Map<string, ScoreReason>,
): void => {
  const nutritionReasons = buildNutritionDisplayReasons(product, role);

  nutritionReasons.forEach((reason) => {
    const scoreReason = createReason(reason);

    if (reason.kind === 'positive') {
      addReason(positives, scoreReason);
      return;
    }

    addReason(negatives, scoreReason);
  });
};

export function buildProfileScoreReasons({
  product,
  role,
  safety,
  aiProfileInfo,
}: BuildProfileScoreReasonsInput): ScoreReasonBuckets {
  const positives = new Map<string, ScoreReason>();
  const negatives = new Map<string, ScoreReason>();

  addNutritionReasons(product, role, positives, negatives);
  addSafetyReasons(product, safety, aiProfileInfo, negatives);

  return {
    positives: Array.from(positives.values()),
    negatives: Array.from(negatives.values()),
  };
}
