import type { IngredientAnalysisItem } from '@acme/shared';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

type IngredientStatus = IngredientAnalysisItem['status'];

interface StatusStyle {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

const STATUS_STYLES: Record<IngredientStatus, StatusStyle> = {
  good: {
    backgroundColor: COLORS.successSoft,
    borderColor: COLORS.successBorder,
    textColor: COLORS.success,
  },
  neutral: {
    backgroundColor: COLORS.gray100,
    borderColor: COLORS.gray200,
    textColor: COLORS.gray700,
  },
  warning: {
    backgroundColor: COLORS.warningSoft,
    borderColor: COLORS.warningBorder,
    textColor: COLORS.warning,
  },
  bad: {
    backgroundColor: COLORS.dangerSoft,
    borderColor: COLORS.dangerBorder,
    textColor: COLORS.danger,
  },
};

interface IngredientChipProps {
  ingredient: IngredientAnalysisItem;
}

export function IngredientChip({ ingredient }: IngredientChipProps) {
  const style = STATUS_STYLES[ingredient.status];

  return (
    <View
      accessibilityLabel={`${ingredient.label}, ${ingredient.status}`}
      style={{
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      <Typography
        variant="fieldLabel"
        style={{ color: style.textColor }}
        className="text-center"
      >
        {ingredient.label}
      </Typography>
    </View>
  );
}
