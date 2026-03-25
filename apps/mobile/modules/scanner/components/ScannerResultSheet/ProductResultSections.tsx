import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';

interface SectionProps {
  title: string;
  children: ReactNode;
}

interface ChipProps {
  label: string;
  tone?: 'default' | 'warning' | 'danger';
}

interface IngredientsSectionProps {
  product: {
    ingredients: string[];
    ingredients_text: string | null;
  };
}

export function Section({ title, children }: SectionProps) {
  return (
    <View className="mt-5 rounded-xl border border-gray-100 bg-white px-4 py-4">
      <Typography variant="fieldLabel" className="mb-3 text-gray-500">
        {title}
      </Typography>
      {children}
    </View>
  );
}

export function Chip({ label, tone = 'default' }: ChipProps) {
  const className =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50'
      : tone === 'danger'
        ? 'border-red-200 bg-red-50'
        : 'border-gray-200 bg-gray-50';

  return (
    <View className={`rounded-full border px-3 py-2 ${className}`}>
      <Typography variant="bodySecondary" className="text-gray-700">
        {label}
      </Typography>
    </View>
  );
}

export function IngredientsSection({ product }: IngredientsSectionProps) {
  if (product.ingredients.length === 0 && !product.ingredients_text) {
    return null;
  }

  return (
    <Section title="Ingredients">
      {product.ingredients.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {product.ingredients.map((ingredient) => (
            <Chip key={ingredient} label={ingredient} />
          ))}
        </View>
      ) : (
        <Typography variant="bodySecondary" className="leading-6 text-gray-700">
          {product.ingredients_text}
        </Typography>
      )}
    </Section>
  );
}
