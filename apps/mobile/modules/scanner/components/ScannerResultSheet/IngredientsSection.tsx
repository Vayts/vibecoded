import type { IngredientAnalysis, IngredientStatus } from '@acme/shared';
import { Text, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

const STATUS_TEXT_COLORS: Record<IngredientStatus, string> = {
  good: COLORS.success,
  neutral: COLORS.gray700,
  warning: COLORS.warning,
  bad: COLORS.danger,
};

interface IngredientsSectionProps {
  rawIngredients: string[];
  rawIngredientsText: string | null;
  analysis?: IngredientAnalysis | null;
}

export function IngredientsSection({ rawIngredients, rawIngredientsText, analysis }: IngredientsSectionProps) {
  // If we have analyzed ingredients, show them with highlighting
  if (analysis && analysis.ingredients.length > 0) {
    return (
      <View className="mt-5 overflow-hidden bg-white">
        <View className="py-1">
          <Typography variant="sectionTitle" className="text-gray-900">
            Ingredients
          </Typography>
        </View>

        <Text className="py-1 leading-6">
          {analysis.ingredients.map((ingredient, index) => (
            <Text key={`ingredient-${index}`}>
              <Text
                style={{ color: STATUS_TEXT_COLORS[ingredient.status] }}
                className="text-sm font-medium"
              >
                {ingredient.name}
              </Text>
              {index < analysis.ingredients.length - 1 ? (
                <Text className="text-sm text-gray-500">{', '}</Text>
              ) : null}
            </Text>
          ))}
        </Text>
      </View>
    );
  }

  // Fallback: show raw ingredients without analysis
  if (rawIngredients.length === 0 && !rawIngredientsText) {
    return null;
  }

  return (
    <View className="mt-5 overflow-hidden bg-white">
      <View className="py-1">
        <Typography variant="sectionTitle" className="text-gray-900">
          Ingredients
        </Typography>
      </View>

      <Text className="py-1 leading-6">
        {rawIngredients.length > 0 ? (
          rawIngredients.map((ingredient, index) => (
            <Text key={`ingredient-${index}`}>
              <Text className="text-sm font-medium text-gray-700">{ingredient}</Text>
              {index < rawIngredients.length - 1 ? (
                <Text className="text-sm text-gray-500">{', '}</Text>
              ) : null}
            </Text>
          ))
        ) : (
          <Text className="text-sm leading-6 text-gray-700">{rawIngredientsText}</Text>
        )}
      </Text>
    </View>
  );
}
