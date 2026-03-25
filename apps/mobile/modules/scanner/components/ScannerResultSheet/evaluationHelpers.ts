import type { ProductAnalysisItem, ProductAnalysisResult } from '@acme/shared';
import { COLORS } from '../../../../shared/constants/colors';

type RatingKey = ProductAnalysisResult['rating'];
type SeverityKey = ProductAnalysisItem['severity'];

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
    backgroundColor: COLORS.successSoft,
    borderColor: COLORS.success,
    textColor: COLORS.success,
    mutedTextColor: COLORS.success,
    badgeColor: COLORS.success,
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

const SEVERITY_TONES: Record<SeverityKey, SeverityTone> = {
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

export const getRatingTone = (rating: ProductAnalysisResult['rating']): RatingTone => {
  return RATING_TONES[rating];
};

export const formatRatingLabel = (rating: ProductAnalysisResult['rating']): string => {
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
  label: 'great_fit' | 'good_fit' | 'neutral' | 'poor_fit',
): ProductAnalysisResult['rating'] => {
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

export const getSeverityTone = (severity: ProductAnalysisItem['severity']): SeverityTone => {
  return SEVERITY_TONES[severity];
};

export const formatEvaluationValue = (item: ProductAnalysisItem): string | null => {
  if (item.value == null) {
    return null;
  }

  return item.unit ? `${item.value}${item.unit}` : `${item.value}`;
};
