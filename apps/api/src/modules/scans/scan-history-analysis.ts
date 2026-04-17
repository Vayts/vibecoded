import type { ProfileProductScore, ScanHistoryItem } from '@acme/shared';
import { profileProductScoreSchema } from '@acme/shared';

const UNCLEAR_DIET_PREFIX = 'cannot confirm compatibility with your diet';

interface HistoryAnalysisSummary {
  personalScore: number | null;
  personalRating: ScanHistoryItem['personalRating'];
  profileChips: ScanHistoryItem['profileChips'];
  mainUserHasDietConflict: boolean;
}

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
  };
};
