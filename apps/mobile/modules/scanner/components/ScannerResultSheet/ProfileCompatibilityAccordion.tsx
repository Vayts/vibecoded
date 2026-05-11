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

const getStatusPriority = (statusLabel: string): number => {
  if (statusLabel === 'Detected') return 4;
  if (statusLabel === 'Not compatible') return 3;
  if (statusLabel === 'Trace risk') return 2;
  if (statusLabel === 'Needs verification') return 1;
  if (statusLabel === 'Unclear') return 0;
  return -1;
};

const dedupeValues = (values: string[]): string[] => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalizedValue = value.trim();

    if (!normalizedValue || seen.has(normalizedValue)) return false;
    seen.add(normalizedValue);
    return true;
  });
};

const mergeConcernItems = (items: CompatibilityAccordionItem[]): CompatibilityAccordionItem[] => {
  const merged = new Map<string, CompatibilityAccordionItem & { statusPriority: number }>();

  for (const item of items) {
    const statusPriority = getStatusPriority(item.statusLabel);
    const existing = merged.get(item.key);

    if (!existing) {
      merged.set(item.key, {
        ...item,
        ingredients: dedupeValues(item.ingredients),
        evidence: dedupeValues(item.evidence),
        statusPriority,
      });
      continue;
    }

    merged.set(item.key, {
      ...existing,
      statusLabel:
        statusPriority > existing.statusPriority ? item.statusLabel : existing.statusLabel,
      ingredients: dedupeValues([...existing.ingredients, ...item.ingredients]),
      evidence: dedupeValues([...existing.evidence, ...item.evidence]),
      statusPriority: Math.max(existing.statusPriority, statusPriority),
    });
  }

  return [...merged.values()].map((item) => ({
    key: item.key,
    title: item.title,
    statusLabel: item.statusLabel,
    ingredients: item.ingredients,
    evidence: item.evidence,
  }));
};

export function ProfileCompatibilityAccordion({ profile }: ProfileCompatibilityAccordionProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const concerns = useMemo(() => {
    const restrictionItems = profile.ai.restrictionDetections
      .filter((detection) => detection.status !== 'compatible')
      .map<CompatibilityAccordionItem>((detection) => ({
        key: `concern-${detection.restriction}`,
        title: normalizeLabel(detection.restriction),
        statusLabel: getRestrictionStatusLabel(detection.status),
        ingredients: detection.ingredients,
        evidence: detection.evidence,
      }));

    const allergenItems = profile.ai.allergenDetections
      .filter((detection) => detection.detected)
      .map<CompatibilityAccordionItem>((detection) => ({
        key: `concern-${detection.allergy}`,
        title: normalizeLabel(detection.allergy),
        statusLabel: 'Detected',
        ingredients: detection.ingredients,
        evidence: detection.evidence,
      }));

    const traceItems = profile.ai.traceDetections.map<CompatibilityAccordionItem>(
      (detection) => {
        const target = detection.restriction ?? detection.allergy ?? detection.trace;

        return {
          key: `concern-${target}`,
          title: normalizeLabel(target),
          statusLabel: 'Trace risk',
          ingredients: detection.trace.trim() ? [detection.trace.trim()] : [],
          evidence: detection.evidence,
        };
      },
    );

    return mergeConcernItems([...restrictionItems, ...allergenItems, ...traceItems]);
  }, [profile]);

  if (concerns.length === 0) {
    return null;
  }

  return (
    <View className="mt-4 border bg-accent-50 border-accent-200 overflow-hidden rounded-[20px]">
      <View className="px-4">
        {concerns.map((concern, index) => {
          const isExpandable = concern.ingredients.length > 0;
          const isExpanded = expandedKey === concern.key;

          return (
            <View key={concern.key} className={index > 0 ? 'border-t border-neutral-200' : ''}>
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={
                  isExpandable
                    ? `${concern.title}. ${isExpanded ? 'Hide details' : 'Show details'}`
                    : `${concern.title}. ${concern.statusLabel}`
                }
                accessibilityState={{
                  disabled: !isExpandable,
                  expanded: isExpandable ? isExpanded : undefined,
                }}
                className="flex-row items-center justify-between gap-3 py-3"
                disabled={!isExpandable}
                onPress={() => {
                  if (!isExpandable) {
                    return;
                  }

                  setExpandedKey((currentKey) => (currentKey === concern.key ? null : concern.key));
                }}
              >
                <View className="flex-1 flex-row items-center gap-2">
                  <View className="h-8 w-8 rounded-full justify-center items-center bg-accent-600">
                    <LeavesIcon color={COLORS.white} />
                  </View>

                  <View>
                    <Typography
                      variant="body"
                      className="font-semibold text-[14px] text-neutrals-900"
                    >
                      {concern.title}
                    </Typography>
                    <Typography variant="bodySecondary" className="mt-1 text-neutrals-600">
                      {concern.ingredients.length > 0
                        ? `${getIngredientCountLabel(concern.ingredients.length)}`
                        : concern.statusLabel}
                    </Typography>
                  </View>
                </View>

                {isExpandable ? (
                  isExpanded ? (
                    <ChevronUp color={COLORS.accent900} size={18} strokeWidth={2.2} />
                  ) : (
                    <ChevronDown color={COLORS.accent900} size={18} strokeWidth={2.2} />
                  )
                ) : null}
              </TouchableOpacity>

              {isExpandable && isExpanded ? (
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
