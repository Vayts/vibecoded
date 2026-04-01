import type {
  BarcodeLookupProduct,
  EvaluationItem,
  NegativeProductAnalysisItem,
  PositiveProductAnalysisItem,
  ProductAnalysisItem,
  ProductAnalysisResult,
} from '@acme/shared';

import { evaluateProduct } from '../product-evaluation/evaluate-product';
import { dedupeAnalysisItemsByLabel } from './item-dedup';

const HIDDEN_ANALYSIS_KEYS = new Set<string>();

const buildAdditiveOverview = (product: BarcodeLookupProduct, item: EvaluationItem): string => {
  const additiveCount = product.additives_count ?? product.additives.length;
  const preview = product.additives.slice(0, 3).join(', ');
  const suffix = product.additives.length > 3 ? ` and ${product.additives.length - 3} more` : '';
  const details = preview ? ` Listed additives: ${preview}${suffix}.` : '';

  if (item.severity === 'good' || item.severity === 'neutral') {
    return `${additiveCount} additive${additiveCount === 1 ? '' : 's'} listed for this product.${details}`;
  }

  return `${additiveCount} additive${additiveCount === 1 ? '' : 's'} listed for this product, which lowers the score.${details}`;
};

const buildOverview = (product: BarcodeLookupProduct, item: EvaluationItem): string => {
  const formattedValue =
    item.value != null ? `${item.value}${item.unit ? item.unit : ''} per 100g` : null;

  if (item.key === 'protein') {
    return formattedValue
      ? `${formattedValue}. This is a strong protein level for this product.`
      : 'This is a strong protein signal for this product.';
  }

  if (item.key === 'fiber') {
    return formattedValue
      ? `${formattedValue}. This is a strong fiber level for this product.`
      : 'This is a positive fiber signal for this product.';
  }

  if (item.key === 'sugar') {
    return formattedValue
      ? `${formattedValue}. ${item.severity === 'good' ? 'This stays in a lower range and supports the score.' : 'This is higher than ideal and lowers the score.'}`
      : 'Sugar level affected the overall score.';
  }

  if (item.key === 'salt') {
    return formattedValue
      ? `${formattedValue}. ${item.severity === 'good' || item.severity === 'neutral' ? 'This salt level is within a more reasonable range.' : 'This is higher than ideal and lowers the score.'}`
      : 'Salt level affected the overall score.';
  }

  if (item.key === 'calories') {
    return formattedValue
      ? `${formattedValue}. ${item.severity === 'good' || item.severity === 'neutral' ? 'This calorie level is fairly reasonable for the product.' : 'This is more calorie-dense than ideal and lowers the score.'}`
      : 'Calorie density affected the overall score.';
  }

  if (item.key === 'saturated-fat') {
    return formattedValue
      ? `${formattedValue}. ${item.severity === 'good' ? 'This saturated fat level supports the score.' : 'This saturated fat level is higher than ideal and lowers the score.'}`
      : 'Saturated fat affected the overall score.';
  }

  if (item.key === 'ingredients') {
    return formattedValue
      ? `${formattedValue}. ${item.severity === 'good' ? 'A shorter ingredient list is a positive signal here.' : 'A longer ingredient list can suggest heavier processing.'}`
      : 'Ingredients complexity affected the overall score.';
  }

  if (item.key === 'nutriscore') {
    return item.severity === 'good' || item.severity === 'neutral'
      ? 'This grade reflects a more balanced nutritional profile.'
      : 'This grade reflects a weaker nutritional profile overall.';
  }

  if (item.key === 'additives') {
    return buildAdditiveOverview(product, item);
  }

  return item.description;
};

const NUTRITION_KEYS = new Set(['sugar', 'salt', 'protein', 'fiber', 'calories', 'saturated-fat']);
const INGREDIENT_KEYS = new Set(['ingredients', 'additives']);

const getItemCategory = (key: string): 'nutrition' | 'diet' | 'ingredients' | 'restriction' => {
  if (NUTRITION_KEYS.has(key) || key === 'nutriscore') return 'nutrition';
  if (INGREDIENT_KEYS.has(key)) return 'ingredients';
  return 'nutrition';
};

const toAnalysisItem = (
  product: BarcodeLookupProduct,
  item: EvaluationItem,
): ProductAnalysisItem => {
  const category = getItemCategory(item.key);
  return {
    ...item,
    per: NUTRITION_KEYS.has(item.key) ? '100g' : null,
    category,
    overview: buildOverview(product, item),
  };
};

const toPositiveAnalysisItem = (
  product: BarcodeLookupProduct,
  item: EvaluationItem,
): PositiveProductAnalysisItem => {
  const analysisItem = toAnalysisItem(product, item);

  if (analysisItem.severity !== 'good' && analysisItem.severity !== 'neutral') {
    throw new Error(`Invalid positive severity for ${analysisItem.key}`);
  }

  return {
    ...analysisItem,
    severity: analysisItem.severity,
  };
};

const toNegativeAnalysisItem = (
  product: BarcodeLookupProduct,
  item: EvaluationItem,
): NegativeProductAnalysisItem => {
  const analysisItem = toAnalysisItem(product, item);

  if (analysisItem.severity !== 'warning' && analysisItem.severity !== 'bad') {
    throw new Error(`Invalid negative severity for ${analysisItem.key}`);
  }

  return {
    ...analysisItem,
    severity: analysisItem.severity,
  };
};

const buildSummary = (result: ReturnType<typeof evaluateProduct>): string => {
  if (result.rating === 'excellent') {
    return 'Strong overall product profile based on the available nutrition signals.';
  }

  if (result.rating === 'good') {
    return 'Generally solid product profile with more positives than negatives.';
  }

  if (result.rating === 'average') {
    return 'Mixed product profile with a balance of stronger and weaker signals.';
  }

  return 'Weaker product profile based on the available nutrition signals.';
};

const buildWarnings = (product: BarcodeLookupProduct): string[] => {
  const warnings: string[] = [];

  if (product.ingredients.length === 0 && !product.ingredients_text) {
    warnings.push('Ingredients data is limited.');
  }

  if (product.nutrition.sugars_100g == null || product.nutrition.salt_100g == null) {
    warnings.push('Some nutrition fields are missing.');
  }

  return warnings;
};

export const buildProductAnalysisFallback = (
  product: BarcodeLookupProduct,
): ProductAnalysisResult => {
  const result = evaluateProduct(product);
  const visiblePositives = dedupeAnalysisItemsByLabel(
    result.positives
      .filter((item) => !HIDDEN_ANALYSIS_KEYS.has(item.key))
      .map((item) => toPositiveAnalysisItem(product, item)),
  );
  const visibleNegatives = dedupeAnalysisItemsByLabel(
    result.negatives
      .filter((item) => !HIDDEN_ANALYSIS_KEYS.has(item.key))
      .map((item) => toNegativeAnalysisItem(product, item)),
  );

  return {
    overallScore: result.overallScore,
    rating: result.rating,
    summary: buildSummary(result),
    positives: visiblePositives,
    negatives: visibleNegatives,
    warnings: buildWarnings(product),
  };
};
