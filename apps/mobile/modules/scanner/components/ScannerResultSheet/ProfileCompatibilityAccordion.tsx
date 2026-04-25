import type { ProductFacts, ProfileProductScore } from '@acme/shared';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import {
  buildCompatibilityAccordionItems,
  getIngredientCountLabel,
  type ProfileCompatibilityPreferences,
} from './profileCompatibilityAccordionHelpers';
import LeavesIcon from '../../../../assets/icons/leaves.svg';

interface ProfileCompatibilityAccordionProps {
  profile: ProfileProductScore;
  productFacts?: ProductFacts | null;
  profilePreferences: ProfileCompatibilityPreferences | null;
}

export function ProfileCompatibilityAccordion({
  profile,
  productFacts,
  profilePreferences,
}: ProfileCompatibilityAccordionProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const concerns = useMemo(
    () => buildCompatibilityAccordionItems(profile, productFacts, profilePreferences),
    [profile, productFacts, profilePreferences],
  );

  if (concerns.length === 0) {
    return null;
  }

  return (
    <View
      className="mt-4 border bg-accent-50 border-accent-200 overflow-hidden rounded-[20px]"
    >
      <View className="px-4">
        {concerns.map((concern, index) => {
          const isExpanded = expandedKey === concern.key;

          return (
            <View key={concern.key} className={index > 0 ? 'border-t border-neutral-200' : ''}>
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${concern.title}. ${isExpanded ? 'Hide details' : 'Show details'}`}
                className="flex-row items-center justify-between gap-3 py-3"
                onPress={() => {
                  setExpandedKey((currentKey) => (currentKey === concern.key ? null : concern.key));
                }}
              >
                <View className="flex-1 flex-row items-center gap-2">
                  <View className="h-8 w-8 rounded-full justify-center items-center bg-accent-600">
                    <LeavesIcon color={COLORS.white}/>
                  </View>

                  <View>
                    <Typography variant="body" className="font-semibold text-[14px] text-neutrals-900">
                      {concern.title}
                    </Typography>
                    <Typography variant="bodySecondary" className="mt-1 text-neutrals-600">
                      {getIngredientCountLabel(concern.ingredients.length)}
                    </Typography>
                  </View>
                </View>

                {isExpanded ? (
                  <ChevronUp color={COLORS.accent900} size={18} strokeWidth={2.2} />
                ) : (
                  <ChevronDown color={COLORS.accent900} size={18} strokeWidth={2.2} />
                )}
              </TouchableOpacity>

              {isExpanded ? (
                <View className="flex-row flex-wrap gap-1 pb-3 pr-2">
                  {concern.ingredients.map((ingredient) => (
                    <View
                      key={`${concern.key}-${ingredient}`}
                      className="rounded-full border px-3 py-1 bg-accent-100 border-accent-300"
                    >
                      <Typography
                        variant="bodySecondary"
                        className="font-semibold text-[12px] text-accent-900"
                      >
                        {ingredient}
                      </Typography>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}



