import { Text, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

const normalizeIngredient = (value: string): string =>
  value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

interface IngredientsSectionProps {
  rawIngredients: string[];
  rawIngredientsText: string | null;
  highlightedIngredients?: string[];
}

export function IngredientsSection({
  rawIngredients,
  rawIngredientsText,
  highlightedIngredients = [],
}: IngredientsSectionProps) {
  if (rawIngredients.length === 0 && !rawIngredientsText) {
    return null;
  }

  const highlightedSet = new Set(highlightedIngredients.map((ingredient) => normalizeIngredient(ingredient)));

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
              <Text
                className="text-sm font-medium"
                style={{
                  color: highlightedSet.has(normalizeIngredient(ingredient))
                    ? COLORS.accent900
                    : COLORS.gray700,
                }}
              >
                {ingredient}
              </Text>
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
