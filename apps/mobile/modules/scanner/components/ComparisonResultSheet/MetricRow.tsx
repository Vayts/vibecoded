import type {
  ComparisonNutrition,
  ComparisonProductPreview,
  ProductComparisonItem,
} from '@acme/shared';
import { Check, CircleCheck, CircleX, Minus, X } from 'lucide-react-native';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

type MetricDirection = 'higher_better' | 'lower_better';
type DisplayWinner = 'left' | 'right' | 'tie' | 'neither';
type CompatibilityStatus = 'positive' | 'negative' | 'neutral';

interface MetricConfig {
  key: keyof ComparisonNutrition;
  label: string;
  unit: string;
  direction: MetricDirection;
}

const METRICS: MetricConfig[] = [
  { key: 'sugars', label: 'Sugar', unit: 'g', direction: 'lower_better' },
  { key: 'fat', label: 'Fat', unit: 'g', direction: 'lower_better' },
  { key: 'salt', label: 'Salt', unit: 'g', direction: 'lower_better' },
  { key: 'fiber', label: 'Fiber', unit: 'g', direction: 'higher_better' },
  { key: 'protein', label: 'Protein', unit: 'g', direction: 'higher_better' },
];

const PROFILE_FIT_KEYWORD =
  /(allergen|allergy|gluten|dairy|lactose|nut|peanut|soy|egg|shellfish|sesame|vegan|vegetarian|halal|kosher|keto|paleo)/i;

function formatValue(val: number, unit: string): string {
  if (unit === 'kcal') return `${Math.round(val)}`;
  return val % 1 === 0 ? `${val}${unit}` : `${val.toFixed(1)}${unit}`;
}

function getMetricWinner(
  config: MetricConfig,
  leftValue: number | null,
  rightValue: number | null,
): 'left' | 'right' | null {
  if (leftValue == null || rightValue == null || leftValue === rightValue) {
    return null;
  }

  if (config.direction === 'higher_better') {
    return leftValue > rightValue ? 'left' : 'right';
  }

  return leftValue < rightValue ? 'left' : 'right';
}

function hasCompatibilitySignal(comparison: ProductComparisonItem): boolean {
  return [...comparison.positives, ...comparison.negatives].some((text) =>
    PROFILE_FIT_KEYWORD.test(text),
  );
}

function getCompatibilityStatus(
  comparison: ProductComparisonItem,
  fallbackWinner: DisplayWinner,
  side: 'left' | 'right',
): CompatibilityStatus {
  if (comparison.negatives.some((text) => PROFILE_FIT_KEYWORD.test(text))) {
    return 'negative';
  }

  if (comparison.positives.some((text) => PROFILE_FIT_KEYWORD.test(text))) {
    return 'positive';
  }

  if (fallbackWinner === 'neither') {
    return 'negative';
  }

  if (fallbackWinner === side) {
    return 'positive';
  }

  return 'neutral';
}

function ValueCell({
  text,
  highlighted,
  status,
}: {
  text?: string;
  highlighted?: boolean;
  status?: CompatibilityStatus;
}) {
  const backgroundColor = highlighted ? COLORS.primaryLight : COLORS.white;
  const borderColor = highlighted ? COLORS.primary300 : 'transparent';
  const winnerShadowStyle = highlighted
    ? {
        shadowColor: COLORS.successShadow,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
      }
    : null;

  return (
    <View
      className="min-h-[42px] flex-1 items-center justify-center rounded-[12px] border px-2 py-2"
      style={{
        backgroundColor,
        borderColor,
        ...(winnerShadowStyle ?? {}),
      }}
    >
      {status ? (
        status === 'positive' ? (
          <CircleCheck color={COLORS.success} size={18} strokeWidth={2.5} />
        ) : status === 'negative' ? (
          <CircleX color={COLORS.danger} size={18} strokeWidth={2.5} />
        ) : (
          <Minus color={COLORS.gray400} size={18} strokeWidth={2.5} />
        )
      ) : (
        <Typography variant="buttonSmall" className="text-center text-gray-900">
          {text}
        </Typography>
      )}
    </View>
  );
}

interface NutritionComparisonProps {
  leftProduct: ComparisonProductPreview;
  rightProduct: ComparisonProductPreview;
  leftComparison: ProductComparisonItem;
  rightComparison: ProductComparisonItem;
  displayWinner: DisplayWinner;
}

export function NutritionComparison({
  leftProduct,
  rightProduct,
  leftComparison,
  rightComparison,
  displayWinner,
}: NutritionComparisonProps) {
  const nutritionRows = METRICS.filter((config) => {
    const leftValue = leftProduct.nutrition[config.key] as number | null;
    const rightValue = rightProduct.nutrition[config.key] as number | null;
    return leftValue !== null || rightValue !== null;
  });
  const hasCompatibilityData =
    hasCompatibilitySignal(leftComparison) || hasCompatibilitySignal(rightComparison);
  const compatibilityLabel = hasCompatibilityData ? 'Allergens excluded' : 'Profile fit';
  const leftCompatibility = getCompatibilityStatus(leftComparison, displayWinner, 'left');
  const rightCompatibility = getCompatibilityStatus(rightComparison, displayWinner, 'right');

  return (
    <View className="rounded-[28px] bg-white px-4 py-0">
      <View className="mb-4 flex-row items-end justify-between">
        <Typography variant="sectionTitle">Nutrition comparison</Typography>
        <Typography variant="caption" className="text-neutrals-500">
          per 100g
        </Typography>
      </View>

      <View className="flex-row items-start border-b border-neutrals-100 pb-3">
        <View className="w-[94px] pr-3" />
        <View className="flex-1 px-1">
          <Typography variant="buttonSmall" numberOfLines={1} className="text-center text-gray-900">
            {leftProduct.product_name?.trim() || 'Unknown product'}
          </Typography>
          <Typography variant="caption" numberOfLines={1} className="mt-1 text-center text-gray-500">
            {leftProduct.brands || ' '}
          </Typography>
        </View>
        <View className="flex-1 px-1">
          <Typography variant="buttonSmall" numberOfLines={1} className="text-center text-gray-900">
            {rightProduct.product_name?.trim() || 'Unknown product'}
          </Typography>
          <Typography variant="caption" numberOfLines={1} className="mt-1 text-center text-gray-500">
            {rightProduct.brands || ' '}
          </Typography>
        </View>
      </View>

      {nutritionRows.map((config) => {
        const leftValue = leftProduct.nutrition[config.key] as number | null;
        const rightValue = rightProduct.nutrition[config.key] as number | null;
        const rowWinner = getMetricWinner(config, leftValue, rightValue);

        return (
          <View key={config.key} className="flex-row items-center border-b border-neutrals-100 py-2">
            <View className="w-[110px] pr-3">
              <Typography variant="bodySecondary" className="text-gray-700">
                {config.label}
              </Typography>
            </View>
            <View className="flex-1 px-1">
              <ValueCell
                text={leftValue == null ? '—' : formatValue(leftValue, config.unit)}
                highlighted={rowWinner === 'left'}
              />
            </View>
            <View className="flex-1 px-1">
              <ValueCell
                text={rightValue == null ? '—' : formatValue(rightValue, config.unit)}
                highlighted={rowWinner === 'right'}
              />
            </View>
          </View>
        );
      })}

      <View className="flex-row items-center py-3 border-b border-neutrals-100">
        <View className="w-[110px] pr-3">
          <Typography variant="bodySecondary" className="text-gray-700">
            {compatibilityLabel}
          </Typography>
        </View>
        <View className="flex-1 px-1">
          <ValueCell status={leftCompatibility} highlighted={leftCompatibility === 'positive'} />
        </View>
        <View className="flex-1 px-1">
          <ValueCell status={rightCompatibility} highlighted={rightCompatibility === 'positive'} />
        </View>
      </View>
    </View>
  );
}
