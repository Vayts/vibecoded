import type { ProfileProductScore, ScoreReason } from '@acme/shared';
import { ChevronDown, ChevronUp, TriangleAlert } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface ProfileCompatibilityAccordionProps {
  profile: ProfileProductScore;
}

const isCompatibilityConcern = (item: ScoreReason): boolean => {
  return (
    item.source === 'diet' ||
    item.source === 'restriction' ||
    item.source === 'allergen' ||
    item.category === 'diet-matching' ||
    item.category === 'allergens'
  );
};

const getUniqueConcerns = (items: ScoreReason[]): ScoreReason[] => {
  const seenKeys = new Set<string>();

  return items.filter((item) => {
    const dedupeKey = `${item.label}-${item.description}`;

    if (seenKeys.has(dedupeKey)) {
      return false;
    }

    seenKeys.add(dedupeKey);
    return true;
  });
};

export function ProfileCompatibilityAccordion({ profile }: ProfileCompatibilityAccordionProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const concerns = useMemo(
    () => getUniqueConcerns(profile.negatives.filter(isCompatibilityConcern)),
    [profile.negatives],
  );

  if (concerns.length === 0) {
    return null;
  }

  return (
    <View
      className="mt-3 overflow-hidden rounded-[20px]"
      style={{
        backgroundColor: COLORS.warningSoft,
        borderColor: COLORS.warningBorder,
        borderWidth: 1,
      }}
    >
      <View className="flex-row items-center gap-2 px-4 pb-2 pt-4">
        <TriangleAlert color={COLORS.warning} size={16} strokeWidth={2.2} />
        <Typography variant="buttonSmall" className="text-neutrals-900">
          Diet & allergy flags for this profile
        </Typography>
      </View>

      <View className="px-4 pb-4">
        {concerns.map((concern, index) => {
          const isExpanded = expandedKey === concern.key;

          return (
            <View
              key={concern.key}
              className={index > 0 ? 'border-t border-warning-200' : ''}
              style={{ borderTopColor: index > 0 ? COLORS.warningBorder : undefined }}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${concern.label}. ${isExpanded ? 'Hide details' : 'Show details'}`}
                className="min-h-[52px] flex-row items-center justify-between gap-3 py-3"
                onPress={() => {
                  setExpandedKey((currentKey) => (currentKey === concern.key ? null : concern.key));
                }}
              >
                <View className="flex-1">
                  <Typography variant="body" className="font-semibold text-neutrals-900">
                    {concern.label}
                  </Typography>
                </View>

                {isExpanded ? (
                  <ChevronUp color={COLORS.warning} size={18} strokeWidth={2.2} />
                ) : (
                  <ChevronDown color={COLORS.warning} size={18} strokeWidth={2.2} />
                )}
              </TouchableOpacity>

              {isExpanded ? (
                <View className="pb-3 pr-8">
                  <Typography
                    variant="bodySecondary"
                    className="text-neutrals-700"
                    style={{ lineHeight: 20 }}
                  >
                    {concern.description}
                  </Typography>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

