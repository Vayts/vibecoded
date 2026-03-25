import type { BarcodeLookupProduct, BarcodeLookupResponse } from '@acme/shared';
import { Leaf, ShieldAlert } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { formatGrade, formatLabel, getGradeTone, getNutritionTone } from './productResultHelpers';

interface SectionProps {
  title: string;
  children: ReactNode;
}

interface ChipProps {
  label: string;
  tone?: 'default' | 'warning' | 'danger';
}

interface ScoreSectionProps {
  product: BarcodeLookupProduct;
}

interface IngredientsSectionProps {
  product: BarcodeLookupProduct;
}

interface SafetySectionProps {
  product: BarcodeLookupProduct;
}

interface MetadataSectionProps {
  product: BarcodeLookupProduct;
}

interface NotFoundContentProps {
  result: Extract<BarcodeLookupResponse, { success: false }>;
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

function ScoreCard({
  title,
  grade,
  score,
  icon,
}: {
  title: string;
  grade: string | null | undefined;
  score: number | null | undefined;
  icon: ReactNode;
}) {
  const tone = getGradeTone(grade);

  return (
    <View className="flex-1 rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Typography variant="fieldLabel" className="text-gray-500">
          {title}
        </Typography>
        {icon}
      </View>
      <View className="flex-row items-center gap-3">
        <View
          className="h-14 w-14 items-center justify-center rounded-xl"
          style={{
            backgroundColor: tone.backgroundColor,
            borderColor: tone.borderColor,
            borderWidth: 1,
          }}
        >
          <Typography variant="sectionTitle" style={{ color: tone.textColor }}>
            {formatGrade(grade)}
          </Typography>
        </View>
        <View className="flex-1">
          <Typography variant="body" className="text-gray-900">
            {grade ? `Grade ${formatGrade(grade)}` : 'No grade'}
          </Typography>
          {score != null ? (
            <Typography variant="bodySecondary" className="mt-1 text-gray-600">
              Score {score}
            </Typography>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function ScoreSection({ product }: ScoreSectionProps) {
  if (!product.scores.nutriscore_grade && !product.scores.ecoscore_grade) {
    return null;
  }

  return (
    <View className="mt-5 flex-row gap-3">
      {product.scores.nutriscore_grade ? (
        <ScoreCard
          title="Nutri-Score"
          grade={product.scores.nutriscore_grade}
          score={product.scores.nutriscore_score}
          icon={<ShieldAlert color={COLORS.gray500} size={18} />}
        />
      ) : null}
      {product.scores.ecoscore_grade ? (
        <ScoreCard
          title="Eco-Score"
          grade={product.scores.ecoscore_grade}
          score={product.scores.ecoscore_score}
          icon={<Leaf color={COLORS.gray500} size={18} />}
        />
      ) : null}
    </View>
  );
}

export function NutritionSection({ product }: { product: BarcodeLookupProduct }) {
  const rows = [
    {
      key: 'energy_kcal_100g',
      label: 'Calories',
      value: product.nutrition.energy_kcal_100g,
      unit: 'kcal',
    },
    { key: 'proteins_100g', label: 'Protein', value: product.nutrition.proteins_100g, unit: 'g' },
    { key: 'fat_100g', label: 'Fat', value: product.nutrition.fat_100g, unit: 'g' },
    {
      key: 'saturated_fat_100g',
      label: 'Saturated fat',
      value: product.nutrition.saturated_fat_100g,
      unit: 'g',
    },
    {
      key: 'carbohydrates_100g',
      label: 'Carbohydrates',
      value: product.nutrition.carbohydrates_100g,
      unit: 'g',
    },
    { key: 'sugars_100g', label: 'Sugars', value: product.nutrition.sugars_100g, unit: 'g' },
    { key: 'fiber_100g', label: 'Fiber', value: product.nutrition.fiber_100g, unit: 'g' },
    { key: 'salt_100g', label: 'Salt', value: product.nutrition.salt_100g, unit: 'g' },
    { key: 'sodium_100g', label: 'Sodium', value: product.nutrition.sodium_100g, unit: 'g' },
  ].filter((row) => row.value != null);

  if (rows.length === 0) {
    return null;
  }

  return (
    <Section title="Nutrition per 100g">
      <View className="gap-3">
        {rows.map((row) => (
          <View
            key={row.key}
            className="flex-row items-center justify-between rounded-xl bg-gray-50 px-3 py-3"
          >
            <Typography variant="body" className="text-gray-900">
              {row.label}
            </Typography>
            <Typography
              variant="buttonSmall"
              style={{ color: getNutritionTone(row.key, row.value) }}
            >
              {row.value} {row.unit}
            </Typography>
          </View>
        ))}
      </View>
    </Section>
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

export function SafetySection({ product }: SafetySectionProps) {
  if (product.allergens.length === 0 && product.traces.length === 0) {
    return (
      <Section title="Allergens & traces">
        <Typography variant="bodySecondary" className="text-gray-600">
          No known allergens
        </Typography>
      </Section>
    );
  }

  return (
    <Section title="Allergens & traces">
      {product.allergens.length > 0 ? (
        <View>
          <Typography variant="bodySecondary" className="mb-2 text-gray-600">
            Allergens
          </Typography>
          <View className="flex-row flex-wrap gap-2">
            {product.allergens.map((item) => (
              <Chip key={item} label={formatLabel(item)} tone="danger" />
            ))}
          </View>
        </View>
      ) : null}
      {product.traces.length > 0 ? (
        <View className={product.allergens.length > 0 ? 'mt-4' : ''}>
          <Typography variant="bodySecondary" className="mb-2 text-gray-600">
            Traces
          </Typography>
          <View className="flex-row flex-wrap gap-2">
            {product.traces.map((item) => (
              <Chip key={item} label={formatLabel(item)} tone="warning" />
            ))}
          </View>
        </View>
      ) : null}
    </Section>
  );
}

export function MetadataSection({ product }: MetadataSectionProps) {
  const metadataChips = [...product.countries, ...product.category_tags].slice(0, 8);
  if (metadataChips.length === 0 && !product.quantity && !product.serving_size) {
    return null;
  }

  return (
    <Section title="Additional details">
      {metadataChips.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {metadataChips.map((item) => (
            <Chip key={item} label={formatLabel(item)} />
          ))}
        </View>
      ) : null}
      {product.quantity || product.serving_size ? (
        <View className="mt-4 gap-2 rounded-xl bg-gray-50 px-3 py-3">
          {product.quantity ? (
            <View className="flex-row items-center justify-between">
              <Typography variant="bodySecondary">Quantity</Typography>
              <Typography variant="body">{product.quantity}</Typography>
            </View>
          ) : null}
          {product.serving_size ? (
            <View className="flex-row items-center justify-between">
              <Typography variant="bodySecondary">Serving size</Typography>
              <Typography variant="body">{product.serving_size}</Typography>
            </View>
          ) : null}
        </View>
      ) : null}
    </Section>
  );
}

export function NotFoundContent({ result }: NotFoundContentProps) {
  return (
    <Section title="Lookup result">
      <Typography variant="sectionTitle">Product not found</Typography>
      <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-600">
        No product was found for barcode {result.barcode}. Try a clearer scan or another product.
      </Typography>
    </Section>
  );
}
