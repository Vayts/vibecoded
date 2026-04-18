import AdditivesIcon from '../../../../assets/icons/additives.svg';
import AllergensIcon from '../../../../assets/icons/allergens.svg';
import CaloriesIcon from '../../../../assets/icons/calories.svg';
import CarbohydratesIcon from '../../../../assets/icons/carbohydrates.svg';
import FiberIcon from '../../../../assets/icons/fiber.svg';
import DietMatchIcon from '../../../../assets/icons/diet-match.svg';
import FatIcon from '../../../../assets/icons/fat.svg';
import ProteinIcon from '../../../../assets/icons/protein.svg';
import SaltIcon from '../../../../assets/icons/salt.svg';
import SaturatedFatIcon from '../../../../assets/icons/saturated-fat.svg';
import SugarIcon from '../../../../assets/icons/sugar.svg';
import { CircleCheck, CircleX, Leaf } from 'lucide-react-native';
import type { ComparisonProductKey } from '@acme/shared';
import type { ComponentType } from 'react';
import type { SvgProps } from 'react-native-svg';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import type {
  ComparisonDisplayNutritionRow,
  ComparisonStatusIndicator,
} from './comparisonNutritionRows';

interface ProductHeader {
  brand: string | null | undefined;
  title: string;
}

interface ComparisonNutritionTableProps {
  leftProduct: ProductHeader;
  rightProduct: ProductHeader;
  rows: ComparisonDisplayNutritionRow[];
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
  fiber: FiberIcon,
  protein: ProteinIcon,
  salt: SaltIcon,
  saturatedfat: SaturatedFatIcon,
  sugar: SugarIcon,
  sugars: SugarIcon,
};

const normalizeIconKey = (value: string | null): string =>
  (value ?? '').toLowerCase().replace(/[^a-z]/g, '');

function MetricIcon({ iconKey }: { iconKey: string | null }) {
  const Icon = ICONS[normalizeIconKey(iconKey)] ?? DietMatchIcon;

  return (
    <View className="h-5 w-5 items-center justify-center">
      <Icon color={COLORS.neutrals400} width={18} height={18} />
    </View>
  );
}

function StatusCell({ status }: { status: ComparisonStatusIndicator | undefined }) {
  if (status === 'positive') {
    return <CircleCheck color={COLORS.success} size={18} strokeWidth={2.4} />;
  }

  if (status === 'negative') {
    return <CircleX color={COLORS.danger800} size={18} strokeWidth={2.4} />;
  }

  return <Typography variant="buttonSmall" className="text-gray-400">—</Typography>;
}

function ValueCell({ emphasized, value }: { emphasized: boolean; value: string }) {
  return (
    <Typography
      variant="buttonSmall"
      className="text-center"
      style={{ color: emphasized ? COLORS.success : COLORS.gray900 }}
    >
      {value}
    </Typography>
  );
}

const isWinner = (winner: ComparisonProductKey | 'tie' | null, side: ComparisonProductKey) =>
  winner === side;

export function ComparisonNutritionTable({
  leftProduct,
  rightProduct,
  rows,
}: ComparisonNutritionTableProps) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <View className="pt-6">
      <Typography variant="sectionTitle" className="text-neutrals-900 font-bold text-[16px]">Nutrition comparison</Typography>

      <View className="mt-4 flex-row items-center border-b border-gray-200 pb-3">
        <View className="w-[108px] pr-3">
          <Typography variant="bodySecondary" className="text-gray-500">
            per 100g
          </Typography>
        </View>
        <View className="flex-1 items-center px-1">
          <Typography variant="buttonSmall" numberOfLines={1} className="text-center text-gray-900">
            {leftProduct.title}
          </Typography>
          <Typography variant="caption" numberOfLines={1} className="mt-1 text-center text-gray-500">
            {leftProduct.brand ?? ' '}
          </Typography>
        </View>
        <View className="w-7" />
        <View className="flex-1 items-center px-1">
          <Typography variant="buttonSmall" numberOfLines={1} className="text-center text-gray-900">
            {rightProduct.title}
          </Typography>
          <Typography variant="caption" numberOfLines={1} className="mt-1 text-center text-gray-500">
            {rightProduct.brand ?? ' '}
          </Typography>
        </View>
      </View>

      <View>
        {rows.map((row) => (
          <View key={row.key} className="flex-row items-center border-b border-gray-200 py-3">
            <View className="w-[108px] flex-row items-center gap-2 pr-2">
              <MetricIcon iconKey={row.iconKey} />
              <Typography variant="bodySecondary" className="flex-1 text-gray-700">
                {row.label}
              </Typography>
            </View>
            <View className="flex-1 items-center px-1">
              {row.kind === 'status' ? (
                <StatusCell status={row.leftStatus} />
              ) : (
                <ValueCell value={row.leftValue} emphasized={isWinner(row.winner, 'product1')} />
              )}
            </View>
            <View className="w-7 items-center justify-center">
              <Typography variant="buttonSmall" className="text-gray-900">
                {row.comparisonMark ?? ''}
              </Typography>
            </View>
            <View className="flex-1 items-center px-1">
              {row.kind === 'status' ? (
                <StatusCell status={row.rightStatus} />
              ) : (
                <ValueCell value={row.rightValue} emphasized={isWinner(row.winner, 'product2')} />
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}