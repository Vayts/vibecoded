import type { IngredientAnalysisItem, IngredientAnalysisResult } from '@acme/shared';
import { Text, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

type IngredientStatus = IngredientAnalysisItem['status'];

const STATUS_TEXT_COLORS: Record<IngredientStatus, string> = {
  good: COLORS.success,
  neutral: COLORS.gray700,
  warning: COLORS.warning,
  bad: COLORS.danger,
};

interface IngredientsSectionProps {
  ingredientAnalysis: IngredientAnalysisResult;
}

export function IngredientsSection({ ingredientAnalysis }: IngredientsSectionProps) {
  if (ingredientAnalysis.ingredients.length === 0) {
    return null;
  }

  return ( 
    <View className="mt-5 overflow-hidden bg-white">
      <View className="py-1">
        <Typography variant="sectionTitle" className="text-gray-900">
          Ingredients
        </Typography>
      </View>

      {ingredientAnalysis.summary ? (
        <View className="py-1 mb-1">
          <Typography variant="bodySecondary" className="leading-5 text-gray-600">
            {ingredientAnalysis.summary}
          </Typography>
        </View>
      ) : null}

      <Text className="py-1 leading-6">
        {ingredientAnalysis.ingredients.map((ingredient, index) => (
          <Text key={`ingredient-${index}`}>
            <Text style={{ color: STATUS_TEXT_COLORS[ingredient.status] }} className="text-sm font-medium">
              {ingredient.label}
            </Text>
            {index < ingredientAnalysis.ingredients.length - 1 ? (
              <Text className="text-sm text-gray-500">{', '}</Text>
            ) : null}
          </Text>
        ))}
      </Text>
    </View>
  );
}
