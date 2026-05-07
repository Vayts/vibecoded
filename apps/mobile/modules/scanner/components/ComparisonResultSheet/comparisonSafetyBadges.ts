import type { LucideIcon } from 'lucide-react-native';
import { getSafetyIcon } from '../../constants/restriction-icon';
import type { ComparedProduct } from '../../utils/profileCompareTypes';

export interface ComparisonSafetyBadge {
  Icon: LucideIcon;
  key: string;
  label: string;
  tone: 'negative' | 'positive';
}

const normalizeSafetyValue = (value: string): string =>
  value.trim().toLowerCase().replace(/[_-]+/g, ' ');

const toTitleCase = (value: string): string => value.replace(/\b\w/g, (char) => char.toUpperCase());

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
    return toTitleCase(normalizedRestriction.replace(/\s+free$/, '-free'));
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

const formatSafeAllergenBadgeText = (allergen: string): string => {
  const normalizedAllergen = normalizeSafetyValue(allergen);

  if (!normalizedAllergen || normalizedAllergen === 'other') {
    return 'Allergen-safe';
  }

  if (normalizedAllergen.endsWith('free')) {
    return toTitleCase(normalizedAllergen.replace(/\s+free$/, '-free'));
  }

  return `${toTitleCase(normalizedAllergen)}-free`;
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
  label: tone === 'positive' ? formatSafeAllergenBadgeText(allergen) : formatAllergenConflictText(allergen),
  tone,
});

export const getComparisonSafetyBadges = (product: ComparedProduct): ComparisonSafetyBadge[] => {
  const matchedAllergens = new Set(
    (product.analysis.safety?.matchedAllergens ?? []).map(normalizeSafetyValue),
  );
  const violatedRestrictions = new Set(
    (product.analysis.safety?.violatedRestrictions ?? []).map(normalizeSafetyValue),
  );

  const badges = [
    ...(product.analysis.safety?.violatedRestrictions ?? []).map((restriction) =>
      toRestrictionBadge(restriction, 'negative'),
    ),
    ...(product.analysis.safety?.matchedAllergens ?? []).map((allergen) =>
      toAllergenBadge(allergen, 'negative'),
    ),
    ...(product.profile.ai?.restrictionDetections ?? [])
      .filter((detection) => {
        const restriction = normalizeSafetyValue(detection.restriction);
        return restriction && detection.status === 'compatible' && !violatedRestrictions.has(restriction);
      })
      .map((detection) => toRestrictionBadge(detection.restriction, 'positive')),
    ...(product.profile.ai?.allergenDetections ?? [])
      .filter((detection) => {
        const allergen = normalizeSafetyValue(detection.allergy);
        return allergen && !detection.detected && !matchedAllergens.has(allergen);
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

  return [...uniqueBadges.values()];
};

