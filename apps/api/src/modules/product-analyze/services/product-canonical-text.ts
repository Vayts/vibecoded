import type { NormalizedProduct } from '@acme/shared';

interface CanonicalProductTextInput {
  productName?: string | null;
  brand?: string | null;
}

const HTML_ENTITY_PATTERN = /&(#x?[0-9a-f]+|[a-z]+);/gi;
const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

const decodeHtmlEntity = (entity: string): string | null => {
  const normalizedEntity = entity.toLowerCase();
  const namedEntity = NAMED_HTML_ENTITIES[normalizedEntity];
  if (namedEntity) {
    return namedEntity;
  }

  if (!normalizedEntity.startsWith('#')) {
    return null;
  }

  const isHex = normalizedEntity.startsWith('#x');
  const numericPart = normalizedEntity.slice(isHex ? 2 : 1);
  const codePoint = Number.parseInt(numericPart, isHex ? 16 : 10);

  if (!Number.isFinite(codePoint) || codePoint <= 0) {
    return null;
  }

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return null;
  }
};

const decodeHtmlEntities = (value: string): string => {
  let decoded = value;

  for (let attempt = 0; attempt < 3; attempt++) {
    const nextValue = decoded.replace(HTML_ENTITY_PATTERN, (match, entity) => {
      return decodeHtmlEntity(entity) ?? match;
    });

    if (nextValue === decoded) {
      break;
    }

    decoded = nextValue;
  }

  return decoded;
};

export const sanitizeProductText = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const sanitized = decodeHtmlEntities(value)
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();

  return sanitized.length > 0 ? sanitized : null;
};

const sanitizeProductTextArray = (values: string[]): string[] => {
  return values
    .map((value) => sanitizeProductText(value))
    .filter((value): value is string => Boolean(value));
};

export const sanitizeNormalizedProductTextFields = (
  product: NormalizedProduct,
): NormalizedProduct => ({
  ...product,
  product_name: sanitizeProductText(product.product_name),
  brands: sanitizeProductText(product.brands),
  ingredients_text: sanitizeProductText(product.ingredients_text),
  nutriscore_grade: sanitizeProductText(product.nutriscore_grade),
  categories: sanitizeProductText(product.categories),
  quantity: sanitizeProductText(product.quantity),
  serving_size: sanitizeProductText(product.serving_size),
  ingredients: sanitizeProductTextArray(product.ingredients),
  allergens: sanitizeProductTextArray(product.allergens),
  additives: sanitizeProductTextArray(product.additives),
  traces: sanitizeProductTextArray(product.traces),
  countries: sanitizeProductTextArray(product.countries),
  category_tags: sanitizeProductTextArray(product.category_tags),
  scores: {
    ...product.scores,
    nutriscore_grade: sanitizeProductText(product.scores.nutriscore_grade),
    ecoscore_grade: sanitizeProductText(product.scores.ecoscore_grade),
  },
});

const normalizeSegment = (value?: string | null): string => {
  const sanitizedValue = sanitizeProductText(value);
  if (!sanitizedValue) {
    return '';
  }

  return sanitizedValue.toLowerCase();
};

export const buildCanonicalProductText = ({
  productName,
  brand,
}: CanonicalProductTextInput): string | null => {
  const normalizedName = normalizeSegment(productName);
  const normalizedBrand = normalizeSegment(brand);
  const parts = [normalizedName, normalizedBrand].filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  return parts.join(' ');
};
