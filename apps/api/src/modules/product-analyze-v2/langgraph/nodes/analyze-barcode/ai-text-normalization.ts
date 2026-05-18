import { normalizeOpenFoodFactsProduct } from '../../../utils/normalize-open-food-facts-product.util.js';

export const normalizeGroundingText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const normalizeAiEnglishProductName = (
  value: string | null | undefined,
  originalName: string | null,
): string | null => {
  const normalized = value?.trim().replace(/\s+/g, ' ') ?? '';

  if (!normalized) {
    return null;
  }

  if (originalName && normalizeGroundingText(normalized) === normalizeGroundingText(originalName)) {
    return null;
  }

  return normalized;
};

export const uniqueNormalizedValues = (values: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeGroundingText(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(value.trim());
  }

  return result;
};

export const buildTraceGroundingValues = (
  product: ReturnType<typeof normalizeOpenFoodFactsProduct>,
): string[] => uniqueNormalizedValues(product.traces);

export const textContainsGroundedValue = (text: string, groundingValues: string[]): boolean => {
  const normalizedText = normalizeGroundingText(text);
  if (!normalizedText) return false;

  return groundingValues.some((value) => {
    const normalizedValue = normalizeGroundingText(value);
    return (
      normalizedValue.length > 1 &&
      (normalizedText.includes(normalizedValue) || normalizedValue.includes(normalizedText))
    );
  });
};
