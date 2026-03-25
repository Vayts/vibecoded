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
    <View className="mt-5 overflow-hidden rounded-[12px] border border-gray-100 bg-white">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Typography variant="sectionTitle" className="text-gray-900">
          {title}
        </Typography>
        {rightLabel ? (
          <Typography variant="fieldLabel" className="text-gray-500">
            {rightLabel}
          </Typography>
        ) : null}
      </View>

      <View className="border-t border-gray-200">
        {items.length > 0 ? (
          items.map((item, index) => (
            <EvaluationRow
              key={`${title}-${item.key}`}
              item={item}
              isLast={index === items.length - 1}
            />
          ))
        ) : (
          <View className="px-4 py-3">
            <Typography variant="bodySecondary" className="leading-6 text-gray-600">
              {emptyMessage}
            </Typography>
          </View>
        )}
      </View>
    </View>
  );
}
