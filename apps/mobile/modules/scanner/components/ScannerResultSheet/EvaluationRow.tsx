import type { ProductAnalysisItem } from '@acme/shared';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { formatEvaluationValue, getSeverityTone } from './evaluationHelpers';
import { EvaluationRowDetails } from './EvaluationRowDetails';
import { EvaluationRowIcon } from './EvaluationRowIcon';

interface EvaluationRowProps {
  item: ProductAnalysisItem;
  isLast: boolean;
}

export function EvaluationRow({ item, isLast }: EvaluationRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const tone = getSeverityTone(item.severity);
  const formattedValue = formatEvaluationValue(item);
  const ChevronIcon = isExpanded ? ChevronUp : ChevronDown;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.label} details`}
      className={`bg-white px-4 py-3 ${isLast ? '' : 'border-b border-gray-200'}`}
      onPress={() => {
        setIsExpanded((current) => !current);
      }}
    >
      <View className="flex-row items-start gap-3">
        <EvaluationRowIcon item={item} />

        <View className="flex-1">
          <Typography variant="body" className="text-gray-900">
            {item.label}
          </Typography>
          <Typography variant="bodySecondary" className="mt-1 leading-5 text-gray-600">
            {item.description}
          </Typography>
        </View>

        <View className="min-w-[76px] items-end justify-start">
          {formattedValue ? (
            <Typography variant="body" className="text-gray-900">
              {formattedValue}
            </Typography>
          ) : null}

          <View className="mt-1 flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tone.dotColor }} />
            <ChevronIcon color={COLORS.gray500} size={16} />
          </View>
        </View>
      </View>

      {isExpanded ? <EvaluationRowDetails item={item} /> : null}
    </Pressable>
  );
}
