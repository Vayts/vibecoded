import type { LucideIcon } from 'lucide-react-native';
import { RESTRICTION_ICON } from '../../constants/restriction-icon';
import type { ComparedProduct } from '../../utils/profileCompareTypes';

export interface ComparisonSafetyBadge {
  Icon: LucideIcon;
  key: string;
  label: string;
  tone: 'negative' | 'positive';
}

interface ComparisonSafetyBadgePair {
  leftBadges: ComparisonSafetyBadge[];
  rightBadges: ComparisonSafetyBadge[];
}

type BadgeSafetyState = 'negative' | 'positive' | 'unknown';
interface BadgeSnapshot {
  blocked: Set<string>;
  states: Map<string, BadgeSafetyState>;
}

const normalizeSafetyValue = (value: string): string =>
  value.trim().toLowerCase().replace(/[_-]+/g, ' ');
const toTitleCase = (value: string): string => value.replace(/\b\w/g, (char) => char.toUpperCase());
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
  const key = value.toLowerCase().replace(/[^a-z]/g, '') as keyof typeof SAFETY_ICON_ALIASES;
  const iconKey = SAFETY_ICON_ALIASES[key];
  return iconKey ? RESTRICTION_ICON[iconKey] : RESTRICTION_ICON.default;
};

const formatFreeLabel = (value: string): string => {
  const freeLabel = value.endsWith('free') ? value.replace(/\s+free$/, '-free') : `${value}-free`;
  return toTitleCase(freeLabel).replace(/-Free\b/g, '-free');
};

export const formatRestrictionConflictText = (restriction: string): string => {
  const normalized = restriction.trim().toLowerCase().replace(/_/g, '-');
  return normalized ? `Not ${normalized}` : 'Restriction conflict';
};

const formatRestrictionSafeText = (restriction: string): string => {
  const normalized = normalizeSafetyValue(restriction);
  if (!normalized) return 'Diet-friendly';
  return normalized.endsWith('free') ? formatFreeLabel(normalized) : toTitleCase(normalized);
};

export const formatAllergenConflictText = (allergen: string): string => {
  const normalized = allergen.trim().replace(/[_-]+/g, ' ');
  if (!normalized) return 'Allergen conflicts';
  return normalized.toLowerCase() === 'other'
    ? 'Contains your allergen'
    : `Contains ${normalized.toLowerCase()}`;
};

const formatAllergenSafeText = (allergen: string): string => {
  const normalized = normalizeSafetyValue(allergen);
  return !normalized || normalized === 'other' ? 'Allergen-safe' : formatFreeLabel(normalized);
};

const toBadge = (
  value: string,
  tone: ComparisonSafetyBadge['tone'],
  type: 'restriction' | 'allergen',
): ComparisonSafetyBadge => ({
  Icon: getSafetyIcon(value),
  key: `${type}-${tone}-${value}`,
  label:
    type === 'restriction'
      ? tone === 'positive'
        ? formatRestrictionSafeText(value)
        : formatRestrictionConflictText(value)
      : tone === 'positive'
        ? formatAllergenSafeText(value)
        : formatAllergenConflictText(value),
  tone,
});

const createSnapshot = (
  negatives: string[],
  positives: string[],
  blockedValues: string[],
): BadgeSnapshot => {
  const states = new Map<string, BadgeSafetyState>();
  const blocked = new Set<string>();
  negatives
    .map(normalizeSafetyValue)
    .filter(Boolean)
    .forEach((value) => states.set(value, 'negative'));
  blockedValues
    .map(normalizeSafetyValue)
    .filter(Boolean)
    .forEach((value) => {
      if (!states.has(value)) blocked.add(value);
    });
  positives
    .map(normalizeSafetyValue)
    .filter(Boolean)
    .forEach((value) => {
      if (!states.has(value) && !blocked.has(value)) states.set(value, 'positive');
    });
  return { blocked, states };
};

const getRestrictionSnapshot = (product: ComparedProduct): BadgeSnapshot =>
  createSnapshot(
    product.analysis.safety?.violatedRestrictions ?? [],
    (product.profile.ai?.restrictionDetections ?? [])
      .filter((detection) => detection.status === 'compatible')
      .map((detection) => detection.restriction),
    [
      ...(product.analysis.safety?.traceRestrictions ?? []),
      ...(product.profile.ai?.restrictionDetections ?? [])
        .filter((detection) => detection.status !== 'compatible')
        .map((detection) => detection.restriction),
    ],
  );

const getAllergenSnapshot = (product: ComparedProduct): BadgeSnapshot =>
  createSnapshot(
    [
      ...(product.analysis.safety?.matchedAllergens ?? []),
      ...(product.profile.ai?.allergenDetections ?? [])
        .filter((detection) => detection.detected)
        .map((detection) => detection.allergy),
    ],
    (product.profile.ai?.allergenDetections ?? [])
      .filter((detection) => !detection.detected)
      .map((detection) => detection.allergy),
    product.analysis.safety?.traceAllergens ?? [],
  );

const getComparableState = (
  current: BadgeSafetyState,
  opposite: BadgeSafetyState,
  isBlocked: boolean,
): BadgeSafetyState => {
  if (current !== 'unknown') return current;
  return !isBlocked && opposite === 'negative' ? 'positive' : 'unknown';
};

const collectBadges = (
  left: BadgeSnapshot,
  right: BadgeSnapshot,
  type: 'restriction' | 'allergen',
  leftBadges: ComparisonSafetyBadge[],
  rightBadges: ComparisonSafetyBadge[],
) => {
  const keys = new Set([
    ...left.states.keys(),
    ...right.states.keys(),
    ...left.blocked,
    ...right.blocked,
  ]);
  keys.forEach((key) => {
    const leftState = getComparableState(
      left.states.get(key) ?? 'unknown',
      right.states.get(key) ?? 'unknown',
      left.blocked.has(key),
    );
    const rightState = getComparableState(
      right.states.get(key) ?? 'unknown',
      left.states.get(key) ?? 'unknown',
      right.blocked.has(key),
    );
    if (leftState === rightState || leftState === 'unknown' || rightState === 'unknown') return;
    leftBadges.push(toBadge(key, leftState, type));
    rightBadges.push(toBadge(key, rightState, type));
  });
};

const dedupeBadges = (badges: ComparisonSafetyBadge[]): ComparisonSafetyBadge[] => {
  const unique = new Map<string, ComparisonSafetyBadge>();
  badges.forEach((badge) => {
    const key = `${badge.tone}:${badge.label.toLowerCase()}`;
    if (!unique.has(key)) unique.set(key, badge);
  });
  return Array.from(unique.values());
};

export const getComparisonSafetyBadges = (
  leftProduct: ComparedProduct,
  rightProduct: ComparedProduct,
): ComparisonSafetyBadgePair => {
  const leftBadges: ComparisonSafetyBadge[] = [];
  const rightBadges: ComparisonSafetyBadge[] = [];
  collectBadges(
    getRestrictionSnapshot(leftProduct),
    getRestrictionSnapshot(rightProduct),
    'restriction',
    leftBadges,
    rightBadges,
  );
  collectBadges(
    getAllergenSnapshot(leftProduct),
    getAllergenSnapshot(rightProduct),
    'allergen',
    leftBadges,
    rightBadges,
  );
  return { leftBadges: dedupeBadges(leftBadges), rightBadges: dedupeBadges(rightBadges) };
};
