import type { IngredientAnalysisResult } from '@acme/shared';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { IngredientChip } from './IngredientChip';

interface IngredientsSectionProps {
  ingredientAnalysis: IngredientAnalysisResult;
}

export function IngredientsSection({ ingredientAnalysis }: IngredientsSectionProps) {
  if (ingredientAnalysis.ingredients.length === 0) {
    return null;
  }

  return (
    <View className="mt-5 overflow-hidden rounded-[12px] border border-gray-100 bg-white">
      <View className="px-4 py-3">
        <Typography variant="sectionTitle" className="text-gray-900">
          Ingredients
        </Typography>
      </View>

      {ingredientAnalysis.summary ? (
        <View className="border-t border-gray-100 px-4 py-3">
          <Typography variant="bodySecondary" className="leading-5 text-gray-600">
            {ingredientAnalysis.summary}
          </Typography>
        </View>
      ) : null}

      <View className="flex-row flex-wrap gap-2 border-t border-gray-100 px-4 py-3">
        {ingredientAnalysis.ingredients.map((ingredient, index) => (
          <IngredientChip key={`ingredient-${index}`} ingredient={ingredient} />
        ))}
      </View>
    </View>
  );
}
