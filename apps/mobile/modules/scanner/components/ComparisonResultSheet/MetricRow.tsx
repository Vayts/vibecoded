import type { ComparisonNutrition } from '@acme/shared';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

type MetricDirection = 'higher_better' | 'lower_better';

interface MetricConfig {
  key: keyof ComparisonNutrition;
  label: string;
  unit: string;
  direction: MetricDirection;
}

const METRICS: MetricConfig[] = [
  { key: 'protein', label: 'Protein', unit: 'g', direction: 'higher_better' },
  { key: 'fiber', label: 'Fiber', unit: 'g', direction: 'higher_better' },
  { key: 'sugars', label: 'Sugar', unit: 'g', direction: 'lower_better' },
  { key: 'calories', label: 'Calories', unit: 'kcal', direction: 'lower_better' },
  { key: 'fat', label: 'Fat', unit: 'g', direction: 'lower_better' },
  { key: 'saturatedFat', label: 'Sat. Fat', unit: 'g', direction: 'lower_better' },
  { key: 'salt', label: 'Salt', unit: 'g', direction: 'lower_better' },
];

export { METRICS };
export type { MetricConfig };

function getBarColor(
  isWinner: boolean,
  direction: MetricDirection,
): string {
  if (!isWinner) return COLORS.gray200;
  return direction === 'higher_better' ? COLORS.success : COLORS.success;
}

function getLoserBarColor(direction: MetricDirection): string {
  return direction === 'lower_better' ? COLORS.dangerSoft : COLORS.gray200;
}

interface MetricRowProps {
  config: MetricConfig;
  valueA: number | null;
  valueB: number | null;
}

export function MetricRow({ config, valueA, valueB }: MetricRowProps) {
  const a = valueA ?? 0;
  const b = valueB ?? 0;
  const maxVal = Math.max(a, b, 0.01);
  const pctA = (a / maxVal) * 100;
  const pctB = (b / maxVal) * 100;

  const hasData = valueA !== null || valueB !== null;
  if (!hasData) return null;

  let winnerA = false;
  let winnerB = false;

  if (a !== b) {
    if (config.direction === 'higher_better') {
      winnerA = a > b;
      winnerB = b > a;
    } else {
      winnerA = a < b;
      winnerB = b < a;
    }
  }

  const barColorA = winnerA
    ? getBarColor(true, config.direction)
    : winnerB
      ? getLoserBarColor(config.direction)
      : COLORS.gray200;

  const barColorB = winnerB
    ? getBarColor(true, config.direction)
    : winnerA
      ? getLoserBarColor(config.direction)
      : COLORS.gray200;

  return (
    <View className="mb-3">
      <View className="mb-1 flex-row items-center justify-between">
        <Typography variant="bodySecondary" className="font-medium text-gray-700">
          {config.label}
        </Typography>
      </View>

      {/* Product A bar */}
      <View className="mb-1.5 flex-row items-center gap-2">
        <Typography
          variant="caption"
          className="w-8 text-right font-semibold"
          style={{ color: winnerA ? COLORS.success : COLORS.gray500 }}
        >
          A
        </Typography>
        <View className="h-5 flex-1 overflow-hidden rounded-full bg-gray-100">
          <View
            className="h-full rounded-full"
            style={{
              width: `${Math.max(pctA, 2)}%`,
              backgroundColor: barColorA,
            }}
          />
        </View>
        <View className="min-w-[52px] flex-row items-center justify-end gap-1">
          <Typography
            variant="caption"
            className="font-semibold"
            style={{ color: winnerA ? COLORS.success : COLORS.gray700 }}
          >
            {formatValue(a, config.unit)}
          </Typography>
          {winnerA ? (
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: COLORS.success }}
            />
          ) : null}
        </View>
      </View>

      {/* Product B bar */}
      <View className="flex-row items-center gap-2">
        <Typography
          variant="caption"
          className="w-8 text-right font-semibold"
          style={{ color: winnerB ? COLORS.success : COLORS.gray500 }}
        >
          B
        </Typography>
        <View className="h-5 flex-1 overflow-hidden rounded-full bg-gray-100">
          <View
            className="h-full rounded-full"
            style={{
              width: `${Math.max(pctB, 2)}%`,
              backgroundColor: barColorB,
            }}
          />
        </View>
        <View className="min-w-[52px] flex-row items-center justify-end gap-1">
          <Typography
            variant="caption"
            className="font-semibold"
            style={{ color: winnerB ? COLORS.success : COLORS.gray700 }}
          >
            {formatValue(b, config.unit)}
          </Typography>
          {winnerB ? (
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: COLORS.success }}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function formatValue(val: number, unit: string): string {
  if (unit === 'kcal') return `${Math.round(val)}`;
  return val % 1 === 0 ? `${val}${unit}` : `${val.toFixed(1)}${unit}`;
}

interface MetricsSummaryRowProps {
  nutritionA: ComparisonNutrition;
  nutritionB: ComparisonNutrition;
}

export function MetricsSummaryRow({ nutritionA, nutritionB }: MetricsSummaryRowProps) {
  const chips = METRICS.map((config) => {
    const a = (nutritionA[config.key] as number | null) ?? 0;
    const b = (nutritionB[config.key] as number | null) ?? 0;
    if (a === 0 && b === 0) return null;

    let winner: 'A' | 'B' | 'tie' = 'tie';
    if (a !== b) {
      if (config.direction === 'higher_better') {
        winner = a > b ? 'A' : 'B';
      } else {
        winner = a < b ? 'A' : 'B';
      }
    }

    const color = winner === 'tie' ? COLORS.gray400 : COLORS.success;
    const label = winner === 'tie' ? '=' : winner;

    return { key: config.key, name: config.label, winner: label, color };
  }).filter(Boolean);

  if (chips.length === 0) return null;

  return (
    <View className="mb-4 flex-row flex-wrap gap-2">
      {chips.map((chip) => (
        <View
          key={chip!.key}
          className="flex-row items-center gap-1 rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1"
        >
          <Typography variant="caption" className="text-gray-600">
            {chip!.name}
          </Typography>
          <Typography
            variant="caption"
            className="font-bold"
            style={{ color: chip!.color }}
          >
            {chip!.winner}
          </Typography>
        </View>
      ))}
    </View>
  );
}

interface NutritionComparisonProps {
  nutritionA: ComparisonNutrition;
  nutritionB: ComparisonNutrition;
}

export function NutritionComparison({ nutritionA, nutritionB }: NutritionComparisonProps) {
  const rows = METRICS.filter((config) => {
    const a = nutritionA[config.key] as number | null;
    const b = nutritionB[config.key] as number | null;
    return a !== null || b !== null;
  });

  if (rows.length === 0) return null;

  return (
    <View className="rounded-2xl border border-gray-100 bg-white p-4">
      <Typography variant="sectionTitle" className="mb-3">
        Nutrition Comparison
      </Typography>
      <Typography variant="caption" className="mb-3 text-gray-400">
        Per 100g
      </Typography>
      {rows.map((config) => (
        <MetricRow
          key={config.key}
          config={config}
          valueA={nutritionA[config.key] as number | null}
          valueB={nutritionB[config.key] as number | null}
        />
      ))}
    </View>
  );
}
