import type {
  ProfileProductScore,
  ScanFitBucket,
  ScanHistoryItem,
  SharedScanFilters,
} from '@acme/shared';
import { GOOD_FIT_SCORE_MIN, NEUTRAL_FIT_SCORE_MIN, profileProductScoreSchema } from '@acme/shared';

const UNCLEAR_DIET_PREFIX = 'cannot confirm compatibility with your diet';

interface HistoryAnalysisSummary {
  personalScore: number | null;
  personalRating: ScanHistoryItem['personalRating'];
  profileChips: ScanHistoryItem['profileChips'];
  mainUserHasDietConflict: boolean;
  mainUserHasAllergenConflict: boolean;
}

const getScanFitBucket = (score: number): ScanFitBucket => {
  if (score >= GOOD_FIT_SCORE_MIN) {
    return 'good';
  }

  if (score >= NEUTRAL_FIT_SCORE_MIN) {
    return 'neutral';
  }

  return 'bad';
};

const normalizeLegacyCategoryText = (value: string): string => {
  return value.toLowerCase().replace(/[_-]+/g, ' ').trim();
};

const getParsedProfiles = (value: unknown): ProfileProductScore[] => {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const profiles = (value as { profiles?: unknown[] }).profiles;

  if (!Array.isArray(profiles)) {
    return [];
  }

  return profiles
    .map((profile) => {
      const parsed = profileProductScoreSchema.safeParse(profile);
      return parsed.success ? parsed.data : null;
    })
    .filter((profile): profile is ProfileProductScore => profile != null);
};

const isDietConflictReason = (reason: ProfileProductScore['negatives'][number]): boolean => {
  if (reason.description.toLowerCase().startsWith(UNCLEAR_DIET_PREFIX)) {
    return false;
  }

  if (reason.category === 'diet-matching') {
    return true;
  }

  const key = normalizeLegacyCategoryText(reason.key);
  const label = normalizeLegacyCategoryText(reason.label);
  const source = normalizeLegacyCategoryText(reason.source);

  return (
    source === 'restriction' ||
    key.startsWith('restriction ') ||
    label.includes('diet') ||
    label.includes('compatible') ||
    label.includes('unclear')
  );
};

const hasDietConflict = (profile?: ProfileProductScore): boolean => {
  return Boolean(profile?.negatives.some((reason) => isDietConflictReason(reason)));
};

const hasAllergenConflict = (profile?: ProfileProductScore): boolean => {
  return Boolean(
    profile?.negatives.some(
      (reason) => reason.source === 'allergen' || reason.category === 'allergens',
    ),
  );
};

export const buildHistoryAnalysisSummary = (
  personalResult: unknown,
  multiProfileResult: unknown,
): HistoryAnalysisSummary => {
  const personalProfiles = getParsedProfiles(personalResult);
  const multiProfiles = getParsedProfiles(multiProfileResult);
  const firstProfile = personalProfiles[0] ?? multiProfiles[0];
  const mainUserProfile =
    multiProfiles.find((profile) => profile.profileId === 'you') ??
    personalProfiles.find((profile) => profile.profileId === 'you');
  const profileChips =
    multiProfiles.length > 0
      ? multiProfiles.map((profile) => ({
          profileId: profile.profileId,
          name: profile.name,
          score: profile.score,
          fitLabel: profile.fitLabel,
        }))
      : undefined;

  return {
    personalScore: firstProfile?.score ?? null,
    personalRating: firstProfile?.fitLabel ?? null,
    profileChips,
    mainUserHasDietConflict: hasDietConflict(mainUserProfile),
    mainUserHasAllergenConflict: hasAllergenConflict(mainUserProfile),
  };
};

export const matchesSharedScanFilters = (
  summary: HistoryAnalysisSummary,
  filters: SharedScanFilters,
): boolean => {
  const hasProfileFilter = filters.profileIds.length > 0;
  const hasScoreFilter = filters.fitBuckets.length > 0;
  const profileChips = summary.profileChips ?? [];

  const matchesSelectedBucket = (score: number | null): boolean =>
    score != null && filters.fitBuckets.includes(getScanFitBucket(score));

  const getProfileScore = (profileId: string): number | null => {
    const matchingChip = profileChips.find((chip) => chip.profileId === profileId);

    if (matchingChip) {
      return matchingChip.score;
    }

    if (profileId === 'you') {
      return summary.personalScore;
    }

    return null;
  };

  if (!hasProfileFilter && !hasScoreFilter) {
    return true;
  }

  if (hasProfileFilter && hasScoreFilter) {
    return filters.profileIds.every((profileId) =>
      matchesSelectedBucket(getProfileScore(profileId)),
    );
  }

  const matchingChips = profileChips.filter(
    (chip) => !hasProfileFilter || filters.profileIds.includes(chip.profileId),
  );

  if (matchingChips.length > 0) {
    return !hasScoreFilter || matchingChips.some((chip) => matchesSelectedBucket(chip.score));
  }

  const canUsePrimaryProfileFallback = !hasProfileFilter || filters.profileIds.includes('you');

  if (!canUsePrimaryProfileFallback) {
    return false;
  }

  if (!hasScoreFilter) {
    return true;
  }

  return matchesSelectedBucket(summary.personalScore);
};
