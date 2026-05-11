import type { ScannerProfileResult, ScannerRestrictionDetection } from '@acme/shared';
import type { LucideIcon } from 'lucide-react-native';
import { getSafetyIcon } from '../../constants/restriction-icon';

export interface ProfileSafetyBadge {
  Icon: LucideIcon;
  key: string;
  label: string;
  tone: 'negative' | 'positive' | 'warning';
}

type BadgeTone = ProfileSafetyBadge['tone'];
const TONE_PRIORITY: Record<BadgeTone, number> = {
  negative: 3,
  warning: 2,
  positive: 1,
};
const normalizeValue = (value: string): string =>
  value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
const toTitleCase = (value: string): string => value.replace(/\b\w/g, (char) => char.toUpperCase());
const getConceptKey = (value: string): string =>
  normalizeValue(value)
    .replace(/\s+free$/, '')
    .trim();
const formatFreeLabel = (value: string): string => {
  const normalized = normalizeValue(value);
  const freeLabel = normalized.endsWith('free')
    ? normalized.replace(/\s+free$/, '-free')
    : `${normalized}-free`;
  return toTitleCase(freeLabel).replace(/-Free\b/g, '-free');
};
const formatRestrictionLabel = (restriction: string): string => {
  const normalized = normalizeValue(restriction);
  if (!normalized) return 'Diet-friendly';
  return normalized.endsWith('free') ? formatFreeLabel(normalized) : toTitleCase(normalized);
};
const formatAllergenSafeLabel = (allergen: string): string => {
  const normalized = normalizeValue(allergen);
  if (!normalized || normalized === 'other') return 'Allergen-safe';
  return formatFreeLabel(normalized);
};
const formatAllergenConflictLabel = (allergen: string): string => {
  const normalized = normalizeValue(allergen);
  if (!normalized || normalized === 'other') return 'Contains your allergen';
  return `Contains ${normalized}`;
};
const formatAllergenTraceLabel = (allergen: string): string => {
  const normalized = normalizeValue(allergen);
  if (!normalized || normalized === 'other') return 'Trace allergen risk';
  return `May contain ${normalized}`;
};
const formatRestrictionConflictLabel = (restriction: string): string =>
  `Not ${normalizeValue(restriction).replace(/\s+/g, '-')}`;
const formatRestrictionWarningLabel = (
  restriction: string,
  status: ScannerRestrictionDetection['status'],
): string => {
  const label = formatRestrictionLabel(restriction);
  if (status === 'semi_compatible') return `Trace risk: ${label}`;
  if (status === 'requires_certification') return `Check ${label}`;
  if (status === 'unclear') return `Unclear: ${label}`;
  return `Trace risk: ${label}`;
};
const createBadge = (
  concept: string,
  iconValue: string,
  label: string,
  tone: BadgeTone,
): ProfileSafetyBadge => ({
  Icon: getSafetyIcon(iconValue),
  key: `${tone}-${concept}`,
  label,
  tone,
});
const upsertBadge = (
  badges: Map<string, ProfileSafetyBadge>,
  concept: string,
  iconValue: string,
  label: string,
  tone: BadgeTone,
) => {
  const normalizedConcept = getConceptKey(concept);
  if (!normalizedConcept || !label.trim()) return;
  const existing = badges.get(normalizedConcept);
  if (existing && TONE_PRIORITY[existing.tone] >= TONE_PRIORITY[tone]) return;
  badges.set(normalizedConcept, createBadge(normalizedConcept, iconValue, label, tone));
};
const getAllergenName = (allergy: string, customAllergy?: string | null): string => {
  const customValue = customAllergy?.trim();
  return customValue || allergy;
};
export const buildProfileSafetyBadges = (profile: ScannerProfileResult): ProfileSafetyBadge[] => {
  console.log(profile.ai.allergenDetections);
  
  const badges = new Map<string, ProfileSafetyBadge>();
  profile.ai.restrictionDetections.forEach((detection) => {
    if (detection.status === 'compatible') {
      upsertBadge(
        badges,
        detection.restriction,
        detection.restriction,
        formatRestrictionLabel(detection.restriction),
        'positive',
      );
      return;
    }
    if (detection.status === 'not_compatible') {
      upsertBadge(
        badges,
        detection.restriction,
        detection.restriction,
        formatRestrictionConflictLabel(detection.restriction),
        'negative',
      );
      return;
    }
    upsertBadge(
      badges,
      detection.restriction,
      detection.restriction,
      formatRestrictionWarningLabel(detection.restriction, detection.status),
      'warning',
    );
  });
  profile.ai.allergenDetections.forEach((detection) => {
    const allergenName = getAllergenName(detection.allergy, detection.customAllergy);
    const isTraceSource = detection.source === 'off_trace_tag';
    if (detection.detected) {
      const label = isTraceSource
        ? formatAllergenTraceLabel(allergenName)
        : formatAllergenConflictLabel(allergenName);
      upsertBadge(
        badges,
        allergenName,
        allergenName,
        label,
        isTraceSource ? 'warning' : 'negative',
      );
      return;
    }
    upsertBadge(
      badges,
      allergenName,
      allergenName,
      formatAllergenSafeLabel(allergenName),
      'positive',
    );
  });
  profile.ai.traceDetections.forEach((detection) => {
    const target =
      detection.customAllergy?.trim() ||
      detection.allergy ||
      detection.restriction ||
      detection.trace;
    if (!target.trim()) return;
    const iconValue = detection.restriction || detection.allergy || target;
    const label = detection.restriction
      ? `Trace risk: ${formatRestrictionLabel(detection.restriction)}`
      : formatAllergenTraceLabel(target);
    upsertBadge(badges, target, iconValue, label, 'warning');
  });
  profile.analysis.safety.violatedRestrictions.forEach((restriction) => {
    upsertBadge(
      badges,
      restriction,
      restriction,
      formatRestrictionConflictLabel(restriction),
      'negative',
    );
  });
  profile.analysis.safety.matchedAllergens.forEach((allergen) => {
    upsertBadge(badges, allergen, allergen, formatAllergenConflictLabel(allergen), 'negative');
  });
  profile.analysis.safety.traceRestrictions.forEach((restriction) => {
    upsertBadge(
      badges,
      restriction,
      restriction,
      `Trace risk: ${formatRestrictionLabel(restriction)}`,
      'warning',
    );
  });
  profile.analysis.safety.traceAllergens.forEach((allergen) => {
    upsertBadge(badges, allergen, allergen, formatAllergenTraceLabel(allergen), 'warning');
  });
  return Array.from(badges.values()).sort((left, right) => {
    const toneWeight = TONE_PRIORITY[right.tone] - TONE_PRIORITY[left.tone];
    if (toneWeight !== 0) return toneWeight;

    return left.label.localeCompare(right.label);
  });
};
