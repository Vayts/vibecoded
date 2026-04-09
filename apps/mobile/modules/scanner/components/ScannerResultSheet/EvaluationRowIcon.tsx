import type { ScoreReason, ScoreReasonCategory } from '@acme/shared';
import AdditivesIcon from '../../../../assets/icons/additives.svg';
import AllergensIcon from '../../../../assets/icons/allergens.svg';
import CaloriesIcon from '../../../../assets/icons/calories.svg';
import CarbohydratesIcon from '../../../../assets/icons/carbohydrates.svg';
import DietMatchIcon from '../../../../assets/icons/diet-match.svg';
import FatIcon from '../../../../assets/icons/fat.svg';
import ProteinIcon from '../../../../assets/icons/protein.svg';
import SaltIcon from '../../../../assets/icons/salt.svg';
import SaturatedFatIcon from '../../../../assets/icons/saturated-fat.svg';
import SugarIcon from '../../../../assets/icons/sugar.svg';
import { Sparkle } from 'lucide-react-native';
import { View } from 'react-native';
import { getScoreReasonCategory } from './evaluationHelpers';

interface EvaluationRowIconProps {
  item: ScoreReason;
}

const renderCategoryIcon = (category: ScoreReasonCategory | null) => {
  const iconProps = { width: 20, height: 20 };

  switch (category) {
    case 'additives':
      return <AdditivesIcon {...iconProps} />;
    case 'allergens':
      return <AllergensIcon {...iconProps} />;
    case 'calories':
      return <CaloriesIcon {...iconProps} />;
    case 'carbohydrates':
      return <CarbohydratesIcon {...iconProps} />;
    case 'diet-matching':
      return <DietMatchIcon {...iconProps} />;
    case 'fat':
      return <FatIcon {...iconProps} />;
    case 'protein':
      return <ProteinIcon {...iconProps} />;
    case 'salt':
      return <SaltIcon {...iconProps} />;
    case 'saturated-fat':
      return <SaturatedFatIcon {...iconProps} />;
    case 'sugar':
      return <SugarIcon {...iconProps} />;
    default:
      return <Sparkle size={20} strokeWidth={1.5} />;
  }
};

export function EvaluationRowIcon({ item }: EvaluationRowIconProps) {
  const category = getScoreReasonCategory(item);

  return (
    <View className="h-11 w-11 rounded-md border border-neutrals-200 bg-neutrals-50 items-center justify-center">
      {renderCategoryIcon(category)}
    </View>
  );
}
