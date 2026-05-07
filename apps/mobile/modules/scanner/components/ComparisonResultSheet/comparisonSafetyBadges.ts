import type { LucideIcon } from 'lucide-react-native';
import { RESTRICTION_ICON } from '../../constants/restriction-icon';
import type { ComparedProduct } from '../../utils/profileCompareTypes';

export interface ComparisonSafetyBadge {
  Icon: LucideIcon;
  key: string;
  label: string;
  tone: 'negative' | 'positive';
}

const normalizeSafetyValue = (value: string): string =>
  value.trim().toLowerCase().replace(/[_-]+/g, ' ');

const SAFETY_ICON_ALIASES = {
  vegan: 'VEGAN',
  vegetarian: 'VEGETARIAN',
  keto: 'KETO',
  paleo: 'PALEO',
  gluten: 'GLUTEN_FREE',
  glutenfree: 'GLUTEN_FREE',
  wheat: 'GLUTEN_FREE',
  dairy: 'DAIRY_FREE',
  milk: 'DAIRY_FREE',
  lactose: 'DAIRY_FREE',
  pork: 'PORK_FREE',
  porkfree: 'PORK_FREE',
  nut: 'NUT_FREE',
  nuts: 'NUT_FREE',
  peanut: 'NUT_FREE',
  peanuts: 'NUT_FREE',
  treenut: 'NUT_FREE',
  treenuts: 'NUT_FREE',
} as const;

const getSafetyIcon = (value: string): LucideIcon => {
  const iconKey =
    SAFETY_ICON_ALIASES[
      value.toLowerCase().replace(/[^a-z]/g, '') as keyof typeof SAFETY_ICON_ALIASES
    ];

  return iconKey ? RESTRICTION_ICON[iconKey] : RESTRICTION_ICON.default;
};

const toTitleCase = (value: string): string => value.replace(/\b\w/g, (char) => char.toUpperCase());

const formatFreeLabel = (value: string): string => {
  const freeLabel = value.endsWith('free') ? value.replace(/\s+free$/, '-free') : `${value}-free`;
  return toTitleCase(freeLabel).replace(/-Free\b/g, '-free');
};

export const formatRestrictionConflictText = (restriction: string): string => {
  const normalizedRestriction = restriction.trim().toLowerCase().replace(/_/g, '-');

  if (!normalizedRestriction) {
    return 'Restriction conflict';
  }

  return `Not ${normalizedRestriction}`;
};

const formatCompatibleRestrictionBadgeText = (restriction: string): string => {
  const normalizedRestriction = normalizeSafetyValue(restriction);

  if (!normalizedRestriction) {
    return 'Diet-friendly';
  }

  if (normalizedRestriction.endsWith('free')) {
    return formatFreeLabel(normalizedRestriction);
  }

  return toTitleCase(normalizedRestriction);
};

export const formatAllergenConflictText = (allergen: string): string => {
  const normalizedAllergen = allergen.trim().replace(/[_-]+/g, ' ');

  if (!normalizedAllergen) {
    return 'Allergen conflicts';
  }

  if (normalizedAllergen.toLowerCase() === 'other') {
    return 'Contains your allergen';
  }

  return `Contains ${normalizedAllergen.toLowerCase()}`;
};

const formatTraceAllergenText = (allergen: string): string => {
  const normalizedAllergen = allergen.trim().replace(/[_-]+/g, ' ');

  if (!normalizedAllergen || normalizedAllergen.toLowerCase() === 'other') {
    return 'May contain your allergen';
  }

  return `May contain ${normalizedAllergen.toLowerCase()}`;
};

const formatTraceRestrictionText = (restriction: string): string => {
  const normalizedRestriction = restriction.trim().toLowerCase().replace(/_/g, '-');

  if (!normalizedRestriction) {
    return 'Trace diet risk';
  }

  return `Trace risk: ${normalizedRestriction}`;
};

const formatSafeAllergenBadgeText = (allergen: string): string => {
  const normalizedAllergen = normalizeSafetyValue(allergen);

  if (!normalizedAllergen || normalizedAllergen === 'other') {
    return 'Allergen-safe';
  }

  return formatFreeLabel(normalizedAllergen);
};

const toRestrictionBadge = (
  restriction: string,
  tone: ComparisonSafetyBadge['tone'],
): ComparisonSafetyBadge => ({
  Icon: getSafetyIcon(restriction),
  key: `restriction-${tone}-${restriction}`,
  label:
    tone === 'positive'
      ? formatCompatibleRestrictionBadgeText(restriction)
      : formatRestrictionConflictText(restriction),
  tone,
});

const toAllergenBadge = (
  allergen: string,
  tone: ComparisonSafetyBadge['tone'],
): ComparisonSafetyBadge => ({
  Icon: getSafetyIcon(allergen),
  key: `allergen-${tone}-${allergen}`,
  label:
    tone === 'positive'
      ? formatSafeAllergenBadgeText(allergen)
      : formatAllergenConflictText(allergen),
  tone,
});

const toTraceRestrictionBadge = (restriction: string): ComparisonSafetyBadge => ({
  Icon: getSafetyIcon(restriction),
  key: `trace-restriction-${restriction}`,
  label: formatTraceRestrictionText(restriction),
  tone: 'negative',
});

const toTraceAllergenBadge = (allergen: string): ComparisonSafetyBadge => ({
  Icon: getSafetyIcon(allergen),
  key: `trace-allergen-${allergen}`,
  label: formatTraceAllergenText(allergen),
  tone: 'negative',
});

export const getComparisonSafetyBadges = (product: ComparedProduct): ComparisonSafetyBadge[] => {
  const matchedAllergens = new Set(
    (product.analysis.safety?.matchedAllergens ?? []).map(normalizeSafetyValue),
  );
  const violatedRestrictions = new Set(
    (product.analysis.safety?.violatedRestrictions ?? []).map(normalizeSafetyValue),
  );
  const traceAllergens = new Set(
    (product.analysis.safety?.traceAllergens ?? []).map(normalizeSafetyValue),
  );
  const traceRestrictions = new Set(
    (product.analysis.safety?.traceRestrictions ?? []).map(normalizeSafetyValue),
  );

  const badges = [
    ...(product.analysis.safety?.violatedRestrictions ?? []).map((restriction) =>
      toRestrictionBadge(restriction, 'negative'),
    ),
    ...(product.analysis.safety?.matchedAllergens ?? []).map((allergen) =>
      toAllergenBadge(allergen, 'negative'),
    ),
    ...(product.analysis.safety?.traceRestrictions ?? []).map(toTraceRestrictionBadge),
    ...(product.analysis.safety?.traceAllergens ?? []).map(toTraceAllergenBadge),
    ...(product.profile.ai?.restrictionDetections ?? [])
      .filter((detection) => {
        const restriction = normalizeSafetyValue(detection.restriction);
        return (
          restriction &&
          detection.status === 'compatible' &&
          !violatedRestrictions.has(restriction) &&
          !traceRestrictions.has(restriction)
        );
      })
      .map((detection) => toRestrictionBadge(detection.restriction, 'positive')),
    ...(product.profile.ai?.allergenDetections ?? [])
      .filter((detection) => {
        const allergen = normalizeSafetyValue(detection.allergy);
        return (
          allergen &&
          !detection.detected &&
          !matchedAllergens.has(allergen) &&
          !traceAllergens.has(allergen)
        );
      })
      .map((detection) => toAllergenBadge(detection.allergy, 'positive')),
  ];

  const uniqueBadges = new Map<string, ComparisonSafetyBadge>();
  badges.forEach((badge) => {
    const badgeKey = `${badge.tone}:${badge.label.toLowerCase()}`;

    if (!uniqueBadges.has(badgeKey)) {
      uniqueBadges.set(badgeKey, badge);
    }
  });

  return Array.from(uniqueBadges.values());
};
