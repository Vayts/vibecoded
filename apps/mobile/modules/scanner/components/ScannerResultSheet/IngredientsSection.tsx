import type { ScannerProfileIngredient } from '@acme/shared';
import { Text, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface IngredientsSectionProps {
  rawIngredients: string[];
  rawIngredientsText: string | null;
  profileIngredients?: ScannerProfileIngredient[];
}

export function IngredientsSection({
  rawIngredients,
  rawIngredientsText,
  profileIngredients = [],
}: IngredientsSectionProps) {
  if (profileIngredients.length === 0 && rawIngredients.length === 0 && !rawIngredientsText) {
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
        {profileIngredients.length > 0 ? (
          profileIngredients.map((ingredient, index) => (
            <Text key={`ingredient-${index}`}>
              <Text
                className="text-sm font-medium"
                style={{
                  color: ingredient.compatible ? COLORS.black : COLORS.danger,
                }}
              >
                {ingredient.name}
              </Text>
              {index < profileIngredients.length - 1 ? (
                <Text className="text-sm text-gray-500">{', '}</Text>
              ) : null}
            </Text>
          ))
        ) : rawIngredients.length > 0 ? (
          rawIngredients.map((ingredient, index) => (
            <Text key={`ingredient-${index}`}>
              <Text className="text-sm font-medium" style={{ color: COLORS.black }}>
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
