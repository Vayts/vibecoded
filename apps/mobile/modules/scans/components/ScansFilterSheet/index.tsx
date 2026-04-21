import type { ScanFitBucket } from '@acme/shared';
import React, { useEffect, useState } from 'react';
import ActionSheet, { SheetManager, useSheetPayload } from 'react-native-actions-sheet';
import { TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import { UserAvatar } from '../../../../shared/components/UserAvatar';
import { SheetsEnum } from '../../../../shared/types/sheets';
import {
  EMPTY_COMPARISON_FILTERS,
  EMPTY_SHARED_SCAN_FILTERS,
  type ComparisonFilters,
  type ScansFilterSheetPayload,
  type SharedScanFilters,
} from '../../types/filters';
import { ComparisonFilterProfiles } from './ComparisonFilterProfiles';
import { SCORE_OPTIONS, SelectionIndicator, toggleSelection } from './filterSheetOptions';

export function ScansFilterSheet() {
  const insets = useSafeAreaInsets();
  const payload = useSheetPayload(SheetsEnum.ScansFilterSheet) as ScansFilterSheetPayload | null;
  const [sharedFilters, setSharedFilters] = useState<SharedScanFilters>(EMPTY_SHARED_SCAN_FILTERS);
  const [comparisonFilters, setComparisonFilters] = useState<ComparisonFilters>(EMPTY_COMPARISON_FILTERS);

  useEffect(() => {
    if (!payload) {
      return;
    }

    if (payload.tab === 'comparisons') {
      setComparisonFilters(payload.filters);
      return;
    }

    setSharedFilters(payload.filters);
  }, [payload]);

  if (!payload) {
    return null;
  }

  const isComparisonTab = payload.tab === 'comparisons';
  const selectedProfileIds = isComparisonTab ? comparisonFilters.selectedProfileIds : sharedFilters.selectedProfileIds;
  const selectedFitBuckets = isComparisonTab ? [] : sharedFilters.selectedFitBuckets;
  const isComparisonClearDisabled = isComparisonTab && selectedProfileIds.length === 0;

  const handleToggleProfile = (profileId: string) => {
    if (isComparisonTab) {
      setComparisonFilters((current) => ({
        ...current,
        selectedProfileIds: toggleSelection(current.selectedProfileIds, profileId),
      }));
      return;
    }

    setSharedFilters((current) => ({
      ...current,
      selectedProfileIds: toggleSelection(current.selectedProfileIds, profileId),
    }));
  };

  const handleToggleScore = (bucket: ScanFitBucket) => {
    setSharedFilters((current) => ({
      ...current,
      selectedFitBuckets: toggleSelection(current.selectedFitBuckets, bucket) as ScanFitBucket[],
    }));
  };

  const handleClearAll = async () => {
    if (isComparisonTab) {
      setComparisonFilters(EMPTY_COMPARISON_FILTERS);
      payload.onApply(EMPTY_COMPARISON_FILTERS);
      await SheetManager.hide(SheetsEnum.ScansFilterSheet);
      return;
    }

    setSharedFilters(EMPTY_SHARED_SCAN_FILTERS);
    payload.onApply(EMPTY_SHARED_SCAN_FILTERS);
    await SheetManager.hide(SheetsEnum.ScansFilterSheet);
  };

  const handleApply = async () => {
    if (isComparisonTab) {
      payload.onApply(comparisonFilters);
    } else {
      payload.onApply(sharedFilters);
    }

    await SheetManager.hide(SheetsEnum.ScansFilterSheet);
  };

  return (
    <ActionSheet
      gestureEnabled
      useBottomSafeAreaPadding={false}
      containerStyle={{ borderTopLeftRadius: 32, borderTopRightRadius: 32 }}
      overdrawEnabled={false}
      disableElevation
    >
      <View className="px-4 pt-2" style={{ paddingBottom: insets.bottom + 24 }}>
        <Typography variant="pageTitle">
          {isComparisonTab ? 'Filter comparison results' : 'Filter products'}
        </Typography>

        {payload.resultCount != null ? (
          <Typography variant="bodySecondary" className="mt-2 text-gray-500">
            {payload.resultCount ?? 0} result(s)
          </Typography>
        ) : null}

        <Typography variant="sectionTitle" className="mt-6 font-bold">
          {isComparisonTab ? 'Best fit for' : 'Family member'}
        </Typography>
        {isComparisonTab ? (
          <ComparisonFilterProfiles
            profiles={payload.profileOptions}
            selectedProfileIds={selectedProfileIds}
            onToggleProfile={handleToggleProfile}
          />
        ) : (
          <View className="mt-3 gap-1">
            {payload.profileOptions.map((profile) => {
              const isSelected = selectedProfileIds.includes(profile.id);

              return (
                <TouchableOpacity
                  key={profile.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Toggle ${profile.name} filter`}
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between rounded-2xl px-1 py-1"
                  onPress={() => handleToggleProfile(profile.id)}
                >
                  <View className="flex-row items-center gap-3">
                    <UserAvatar
                      imageUrl={profile.avatarUrl}
                      fallbackImageUrl={profile.fallbackImageUrl}
                      name={profile.name}
                      size="xs"
                    />
                    <Typography>{profile.name}</Typography>
                  </View>
                  <SelectionIndicator selected={isSelected} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {!isComparisonTab ? (
          <>
            <Typography variant="sectionTitle" className="mt-6 font-bold">
              Fit score
            </Typography>
            <View className="mt-3 gap-2">
              {SCORE_OPTIONS.map((option) => {
                const isSelected = selectedFitBuckets.includes(option.key);

                return (
                  <TouchableOpacity
                    key={option.key}
                    accessibilityRole="button"
                    accessibilityLabel={`Toggle ${option.label} fit score filter`}
                    activeOpacity={0.7}
                    className="flex-row items-center justify-between rounded-2xl px-1 py-1"
                    onPress={() => handleToggleScore(option.key)}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className="h-[28px] w-[28px] items-center justify-center rounded-full"
                        style={{ backgroundColor: option.backgroundColor }}
                      >
                        {<option.Icon color={option.iconColor} size={16} strokeWidth={1.5} />}
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Typography>{option.label}</Typography>
                        <Typography className="font-semibold text-neutrals-900">
                          {option.description}
                        </Typography>
                      </View>
                    </View>
                    <SelectionIndicator selected={isSelected} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}

        <View className="mt-6 flex-row gap-3 border-t border-gray-200 pt-6">
          <View className="flex-1">
            <Button
              fullWidth
              variant="secondary"
              label="Clear all"
              disabled={isComparisonClearDisabled}
              onPress={() => void handleClearAll()}
            />
          </View>
          <View className="flex-1">
            <Button fullWidth label="Show results" onPress={() => void handleApply()} />
          </View>
        </View>
      </View>
    </ActionSheet>
  );
}



