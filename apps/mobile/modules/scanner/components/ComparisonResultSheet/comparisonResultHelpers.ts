import type {
  CompareFact,
  ComparedProduct,
  ComparedProductCore,
  ProfileCompareResult,
} from '../../utils/profileCompareTypes';

export type DisplayChip = { iconKey?: string | null; text: string };

export const getProductDisplayName = (product: ComparedProductCore): string => {
  const productName = product.name?.trim();

  if (productName) {
    return productName;
  }

  const brand = product.brand?.trim();
  if (brand) {
    return brand;
  }

  return 'Unknown product';
};

export const getComparedProductDisplayName = (product: ComparedProduct | null): string => {
  if (!product) return 'Unknown product';
  return getProductDisplayName(product.product);
};

export const getTargetLabel = (profileName: string) =>
  profileName.trim().toLowerCase() === 'you' ? 'you' : profileName;

export const simplifyChipText = (text: string): string => {
  const simplified = text
    .replace(/\([^)]*\d[^)]*\)/g, '')
    .replace(/:\s*.*\d.*$/g, '')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:kcal|kj|mg|g|grams?)\b/gi, '')
    .replace(/\bvs\.?\b.*$/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/[,:;.\-–—\s]+$/g, '')
    .trim();

  return simplified || text.trim();
};

export const toDisplayChip = (text: string, iconKey?: string | null): DisplayChip => ({
  iconKey,
  text: simplifyChipText(text),
});

export const dedupeChips = (items: DisplayChip[]) => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.text.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

export const getFactIconKey = (fact: CompareFact): string | null => {
  if (fact.key === 'diet-match' || fact.category === 'restrictions') return 'diet-match';
  return fact.key;
};

export const factsToChips = (facts: CompareFact[]): DisplayChip[] =>
  facts.map((fact) => toDisplayChip(fact.label, getFactIconKey(fact)));

const formatRestrictionChipText = (restriction: string): string => {
  const normalizedRestriction = restriction.trim().replace(/[_-]+/g, ' ');

  if (!normalizedRestriction) {
    return 'Diet conflicts';
  }

  return `Not ${normalizedRestriction.toLowerCase()}-friendly`;
};

const formatAllergenChipText = (allergen: string): string => {
  const normalizedAllergen = allergen.trim().replace(/[_-]+/g, ' ');

  if (!normalizedAllergen) {
    return 'Allergen conflicts';
  }

  return `Contains ${normalizedAllergen.toLowerCase()}`;
};

export const getNoSuitableProductChips = (profileResult: ProfileCompareResult): DisplayChip[] => {
  const allergenChips = profileResult.products.flatMap((product) =>
    (product.analysis.safety?.matchedAllergens ?? []).map((allergen) =>
      toDisplayChip(formatAllergenChipText(allergen), 'allergens'),
    ),
  );

  const restrictionChips = profileResult.products.flatMap((product) =>
    (product.analysis.safety?.violatedRestrictions ?? []).map((restriction) =>
      toDisplayChip(formatRestrictionChipText(restriction), 'diet-match'),
    ),
  );

  const chips = dedupeChips([...allergenChips, ...restrictionChips]);

  if (chips.length > 0) {
    return chips;
  }

  return [toDisplayChip('Allergen or diet conflicts', 'diet-match')];
};
