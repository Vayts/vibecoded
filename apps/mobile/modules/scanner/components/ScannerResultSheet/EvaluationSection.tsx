import type { ProductAnalysisItem } from '@acme/shared';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { EvaluationRow } from './EvaluationRow';

interface EvaluationSectionProps {
  title: string;
  items: ProductAnalysisItem[];
  rightLabel?: string;
  emptyMessage?: string;
}

export function EvaluationSection({
  title,
  items,
  rightLabel,
  emptyMessage,
}: EvaluationSectionProps) {
  if (items.length === 0 && !emptyMessage) {
    return null;
  }

  return (
    <View className="mt-5">
      <View className="mb-3 flex-row items-center justify-between">
        <Typography variant="sectionTitle" className="text-gray-900">
          {title}
        </Typography>
        {rightLabel ? (
          <Typography variant="fieldLabel" className="text-gray-500">
            {rightLabel}
          </Typography>
        ) : null}
      </View>

      <View className="gap-2">
        {items.length > 0 ? (
          items.map((item) => <EvaluationRow key={`${title}-${item.key}`} item={item} />)
        ) : (
          <View className="rounded-xl border border-gray-100 bg-white px-4 py-3">
            <Typography variant="bodySecondary" className="leading-6 text-gray-600">
              {emptyMessage}
            </Typography>
          </View>
        )}
      </View>
    </View>
  );
}
