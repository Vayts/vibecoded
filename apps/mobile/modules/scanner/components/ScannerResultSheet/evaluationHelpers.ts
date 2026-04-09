import type { ScoreReason, FitLabel, ScoreReasonCategory } from '@acme/shared';
import { COLORS } from '../../../../shared/constants/colors';

type RatingKey = 'excellent' | 'good' | 'average' | 'bad';

interface RatingTone {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  mutedTextColor: string;
  badgeColor: string;
}

interface SeverityTone {
  dotColor: string;
  borderColor: string;
  badgeBackgroundColor: string;
  textColor: string;
}

const RATING_TONES: Record<RatingKey, RatingTone> = {
  excellent: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
    textColor: COLORS.primaryDark,
    mutedTextColor: COLORS.primaryDark,
    badgeColor: COLORS.primary,
  },
  good: {
    backgroundColor: COLORS.blueSoft,
    borderColor: COLORS.blueBorder,
    textColor: COLORS.blue,
    mutedTextColor: COLORS.blue,
    badgeColor: COLORS.blue,
  },
  average: {
    backgroundColor: COLORS.warningSoft,
    borderColor: COLORS.warning,
    textColor: COLORS.warning,
    mutedTextColor: COLORS.warning,
    badgeColor: COLORS.warning,
  },
  bad: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.danger,
    textColor: COLORS.danger,
    mutedTextColor: COLORS.danger,
    badgeColor: COLORS.danger,
  },
};

const SEVERITY_TONES: Record<string, SeverityTone> = {
  good: {
    dotColor: COLORS.success,
    borderColor: COLORS.successBorder,
    badgeBackgroundColor: COLORS.successSoft,
    textColor: COLORS.success,
  },
  neutral: {
    dotColor: COLORS.gray400,
    borderColor: COLORS.gray200,
    badgeBackgroundColor: COLORS.gray100,
    textColor: COLORS.gray700,
  },
  warning: {
    dotColor: COLORS.warning,
    borderColor: COLORS.warningBorder,
    badgeBackgroundColor: COLORS.warningSoft,
    textColor: COLORS.warning,
  },
  bad: {
    dotColor: COLORS.danger,
    borderColor: COLORS.dangerBorder,
    badgeBackgroundColor: COLORS.dangerSoft,
    textColor: COLORS.danger,
  },
};

export const getRatingTone = (rating: RatingKey): RatingTone => {
  return RATING_TONES[rating];
};

export const formatRatingLabel = (rating: RatingKey): string => {
  return rating.charAt(0).toUpperCase() + rating.slice(1);
};

export const getFitLabelText = (label: string): string => {
  if (label === 'great_fit') {
    return 'Great fit';
  }

  if (label === 'good_fit') {
    return 'Good fit';
  }

  if (label === 'poor_fit') {
    return 'Poor fit';
  }

  if (label === 'excellent' || label === 'good' || label === 'average' || label === 'bad') {
    return formatRatingLabel(label);
  }

  return 'Neutral fit';
};

export const mapFitLabelToToneKey = (
  label: FitLabel,
): RatingKey => {
  if (label === 'great_fit') {
    return 'excellent';
  }

  if (label === 'good_fit') {
    return 'good';
  }

  if (label === 'poor_fit') {
    return 'bad';
  }

  return 'average';
};

export const getSeverityTone = (kind: ScoreReason['kind']): SeverityTone => {
  if (kind === 'positive') return SEVERITY_TONES.good;
  if (kind === 'negative') return SEVERITY_TONES.bad;
  return SEVERITY_TONES.neutral;
};

const normalizeLegacyCategoryText = (value: string): string => {
  return value.toLowerCase().replace(/[_-]+/g, ' ').trim();
};

const getAdditivesCount = (item: ScoreReason): number | null => {
  if (getScoreReasonCategory(item) !== 'additives') {
    return null;
  }

  if (typeof item.value === 'number' && Number.isFinite(item.value)) {
    return item.value;
  }

  const explicitCountMatch = item.description.match(/contains\s+(\d+)\s+additives/i);
  if (explicitCountMatch) {
    return Number(explicitCountMatch[1]);
  }

  const additiveListMatch = item.description.match(/\(([^)]+)\)/);
  if (!additiveListMatch) {
    return null;
  }

  const additives = additiveListMatch[1]
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return additives.length > 0 ? additives.length : null;
};

export const getScoreReasonCategory = (
  item: ScoreReason,
): ScoreReasonCategory | null => {
  if (item.category) {
    return item.category;
  }

  const key = normalizeLegacyCategoryText(item.key);
  const label = normalizeLegacyCategoryText(item.label);
  const source = normalizeLegacyCategoryText(item.source);

  if (key === 'additives' || label.includes('additive') || source === 'ingredient') {
    return 'additives';
  }

  if (
    key.startsWith('allergen ') ||
    key.startsWith('ingredient flag ') ||
    label.includes('allergen') ||
    source === 'allergen'
  ) {
    return 'allergens';
  }

  if (
    key.startsWith('restriction ') ||
    label.includes('diet') ||
    label.includes('compatible') ||
    label.includes('unclear') ||
    source === 'restriction'
  ) {
    return 'diet-matching';
  }

  if (key === 'sugar' || key.includes('diabetes') || key.includes('low sugar')) {
    return 'sugar';
  }

  if (key === 'salt' || key.includes('low sodium')) {
    return 'salt';
  }

  if (key === 'saturated fat') {
    return 'saturated-fat';
  }

  if (key === 'calories' || key.includes('weight loss')) {
    return 'calories';
  }

  if (key === 'protein' || key.includes('muscle gain') || key.includes('high protein')) {
    return 'protein';
  }

  if (key === 'fat') {
    return 'fat';
  }

  if (key === 'carbs' || key === 'carbohydrates' || key.includes('low carb')) {
    return 'carbohydrates';
  }

  return null;
};

export const formatScoreReasonValue = (item: ScoreReason): string | null => {
  if (item.value == null) {
    const additivesCount = getAdditivesCount(item);
    return additivesCount == null ? null : `${additivesCount}`;
  }

  const formatted =
    typeof item.value === 'number'
      ? parseFloat(item.value.toFixed(2)).toString()
      : `${item.value}`;

  return item.unit ? `${formatted}${item.unit}` : formatted;
};
