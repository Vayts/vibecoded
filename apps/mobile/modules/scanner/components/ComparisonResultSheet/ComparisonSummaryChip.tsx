import AdditivesIcon from '../../../../assets/icons/additives.svg';
import AllergensIcon from '../../../../assets/icons/allergens.svg';
import CaloriesIcon from '../../../../assets/icons/calories.svg';
import CarbohydratesIcon from '../../../../assets/icons/carbohydrates.svg';
import DietMatchIcon from '../../../../assets/icons/diet-match.svg';
import FatIcon from '../../../../assets/icons/fat.svg';
import ProteinIcon from '../../../../assets/icons/protein.svg';
import SaltIcon from '../../../../assets/icons/salt.svg';
import FiberIcon from '../../../../assets/icons/fiber.svg';
import SaturatedFatIcon from '../../../../assets/icons/saturated-fat.svg';
import SugarIcon from '../../../../assets/icons/sugar.svg';
import { ArrowDown, ArrowUp, Leaf } from 'lucide-react-native';
import type { ComponentType } from 'react';
import type { SvgProps } from 'react-native-svg';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

type ChipVariant = 'primary' | 'secondary' | 'negative';
type ChipTrend = 'up' | 'down' | null;

interface ComparisonSummaryChipProps {
  iconKey?: string | null;
  text: string;
  variant: ChipVariant;
}

const ICONS: Record<string, ComponentType<SvgProps>> = {
  additives: AdditivesIcon,
  allergens: AllergensIcon,
  calories: CaloriesIcon,
  calorie: CaloriesIcon,
  carbohydrates: CarbohydratesIcon,
  carbs: CarbohydratesIcon,
  dietmatch: DietMatchIcon,
  fat: FatIcon,
  protein: ProteinIcon,
  salt: SaltIcon,
  fiber: FiberIcon,
  saturatedfat: SaturatedFatIcon,
  sugar: SugarIcon,
  sugars: SugarIcon,
};

const CHIP_STYLES: Record<
  ChipVariant,
  { backgroundColor: string; borderColor: string; textColor: string; iconColor: string }
> = {
  primary: {
    backgroundColor: COLORS.successSoft,
    borderColor: COLORS.successSoft,
    textColor: COLORS.primary900,
    iconColor: COLORS.primary900,
  },
  secondary: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.gray200,
    textColor: COLORS.primary900,
    iconColor: COLORS.primary900,
  },
  negative: {
    backgroundColor: COLORS.danger50,
    borderColor: COLORS.danger50,
    textColor: COLORS.danger800,
    iconColor: COLORS.danger800,
  },
};

const normalizeIconKey = (value: string | null | undefined): string =>
  (value ?? '').toLowerCase().replace(/[^a-z]/g, '');

const inferIconKey = (text: string, iconKey?: string | null): string | null => {
  const explicitIcon = normalizeIconKey(iconKey);
  if (explicitIcon) {
    return explicitIcon;
  }

  const source = text.toLowerCase();

  if (/additive/.test(source)) return 'additives';
  if (/(allergen|allergy|gluten|dairy|lactose|nut|peanut|soy|egg|shellfish|sesame)/.test(source)) {
    return 'allergens';
  }
  if (/calor/.test(source)) return 'calories';
  if (/(carb|carbohydrate)/.test(source)) return 'carbohydrates';
  if (/saturated fat/.test(source)) return 'saturatedfat';
  if (/fat/.test(source)) return 'fat';
  if (/protein/.test(source)) return 'protein';
  if (/salt/.test(source)) return 'salt';
  if (/sugar/.test(source)) return 'sugar';
  if (/fiber/.test(source)) return 'fiber';
  if (/(keto|vegan|vegetarian|halal|kosher|fit|friendly|compatible|profile)/.test(source)) {
    return 'dietmatch';
  }

  return 'dietmatch';
};

const inferTrend = (text: string): ChipTrend => {
  const source = text.toLowerCase();

  if (/(lower|less|lighter|reduced|smaller|fewer)/.test(source)) {
    return 'down';
  }

  if (/(higher|more|extra|greater|added|richer)/.test(source)) {
    return 'up';
  }

  return null;
};

function SummaryIcon({ iconKey, color }: { iconKey: string | null; color: string }) {
  const Icon = ICONS[iconKey ?? 'dietmatch'] ?? DietMatchIcon;
  return <Icon width={20} height={20} color={color} />;
}

function TrendIcon({ color, trend }: { color: string; trend: ChipTrend }) {
  if (trend === 'up') {
    return <ArrowUp color={color} size={14} strokeWidth={2.2} />;
  }

  if (trend === 'down') {
    return <ArrowDown color={color} size={14} strokeWidth={2.2} />;
  }

  return null;
}

export function ComparisonSummaryChip({
  iconKey,
  text,
  variant,
}: ComparisonSummaryChipProps) {
  const chipStyles = CHIP_STYLES[variant];
  const resolvedIconKey = inferIconKey(text, iconKey);
  const trend = inferTrend(text);

  return (
    <View
      className="flex-row border items-center rounded-full px-3 py-2"
      style={{
        backgroundColor: chipStyles.backgroundColor,
        borderColor: chipStyles.borderColor,
      }}
    >
      <SummaryIcon iconKey={resolvedIconKey} color={chipStyles.iconColor} />
      <Typography
        variant="buttonSmall"
        className="ml-2"
        style={{ color: chipStyles.textColor }}
      >
        {text}
      </Typography>
      {trend ? <View className="ml-1"><TrendIcon color={chipStyles.iconColor} trend={trend} /></View> : null}
    </View>
  );
}