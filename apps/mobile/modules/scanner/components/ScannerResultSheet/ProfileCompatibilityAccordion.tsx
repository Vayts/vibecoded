import type { ScannerProfileResult } from '@acme/shared';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import LeavesIcon from '../../../../assets/icons/leaves.svg';

interface CompatibilityAccordionItem {
  key: string;
  title: string;
  statusLabel: string;
  ingredients: string[];
  evidence: string[];
}

interface ProfileCompatibilityAccordionProps {
  profile: ScannerProfileResult;
}

const normalizeLabel = (value: string): string =>
  value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getIngredientCountLabel = (count: number): string =>
  `${count} ingredient${count === 1 ? '' : 's'}`;

const getRestrictionStatusLabel = (status: string): string => {
  if (status === 'not_compatible') return 'Not compatible';
  if (status === 'semi_compatible') return 'Trace risk';
  if (status === 'requires_certification') return 'Needs verification';
  if (status === 'unclear') return 'Unclear';
  return 'Compatible';
};

export function ProfileCompatibilityAccordion({ profile }: ProfileCompatibilityAccordionProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const concerns = useMemo(
    () => {
      const restrictionItems = profile.ai.restrictionDetections
        .filter((detection) => detection.status !== 'compatible')
        .map<CompatibilityAccordionItem>((detection) => ({
          key: `restriction-${detection.restriction}`,
          title: normalizeLabel(detection.restriction),
          statusLabel: getRestrictionStatusLabel(detection.status),
          ingredients: detection.ingredients,
          evidence: detection.evidence,
        }));

      const allergenItems = profile.ai.allergenDetections
        .filter((detection) => detection.detected)
        .map<CompatibilityAccordionItem>((detection) => ({
          key: `allergen-${detection.allergy}`,
          title: normalizeLabel(detection.allergy),
          statusLabel: detection.source === 'off_trace_tag' ? 'Trace detected' : 'Detected',
          ingredients: detection.ingredients,
          evidence: detection.evidence,
        }));

      return [...restrictionItems, ...allergenItems];
    },
    [profile],
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
                    <LeavesIcon color={COLORS.white} />
                  </View>

                  <View>
                    <Typography variant="body" className="font-semibold text-[14px] text-neutrals-900">
                      {concern.title}
                    </Typography>
                    <Typography variant="bodySecondary" className="mt-1 text-neutrals-600">
                      {concern.ingredients.length > 0
                        ? `${getIngredientCountLabel(concern.ingredients.length)}`
                        : concern.statusLabel}
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
                <View className="pb-3 pr-2">
                  {concern.ingredients.length > 0 ? (
                    <View className="flex-row flex-wrap gap-1">
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
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
