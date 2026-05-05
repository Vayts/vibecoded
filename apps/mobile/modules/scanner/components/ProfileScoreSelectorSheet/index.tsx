import {TouchableOpacity, View } from 'react-native';
import ActionSheet, { SheetManager, useSheetPayload, ScrollView } from 'react-native-actions-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Typography } from '../../../../shared/components/Typography';
import { UserAvatar } from '../../../../shared/components/UserAvatar';
import { COLORS } from '../../../../shared/constants/colors';
import { SheetsEnum } from '../../../../shared/types/sheets';
import type { ProfileScoreSelectorSheetPayload } from '../../types/scanner';
import { getProfileScoreTone, PROFILE_SCORE_TONES } from '../ScannerResultSheet/ProfileScoreSelector';

export function ProfileScoreSelectorSheet() {
  const payload = useSheetPayload(
    SheetsEnum.ProfileScoreSelectorSheet,
  ) as ProfileScoreSelectorSheetPayload | null;
  const insets = useSafeAreaInsets();

  if (!payload) {
    return null;
  }

  const handleSelect = (profileId: string) => {
    payload.onSelect(profileId);
    void SheetManager.hide(SheetsEnum.ProfileScoreSelectorSheet);
  };

  return (
    <ActionSheet
      gestureEnabled
      useBottomSafeAreaPadding={false}
      containerStyle={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' }}
      isModal
      overdrawEnabled={false}
      disableElevation
    >
      <View className="bg-white px-4 pt-2" style={{ paddingBottom: insets.bottom + 16 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {payload.profiles.map((profile) => {
            const isSelected = profile.id === payload.selectedProfileId;
            return (
              <TouchableOpacity
                key={profile.id}
                accessibilityRole="button"
                accessibilityLabel={`${profile.name}${
                  profile.score !== undefined ? `, score ${profile.score}/100` : ''
                }${isSelected ? ', selected' : ''}`}
                activeOpacity={0.7}
                className="min-h-[52px] flex-row items-center rounded-2xl border px-3 py-2"
                style={{
                  backgroundColor: isSelected ? COLORS.primary100 : COLORS.white,
                  borderColor: isSelected ? COLORS.primary300 : COLORS.neutrals200,
                }}
                onPress={() => handleSelect(profile.id)}
              >
                <UserAvatar
                  imageUrl={profile.imageUrl}
                  fallbackImageUrl={profile.fallbackImageUrl}
                  name={profile.name}
                  size="md"
                />

                <Typography variant="button" numberOfLines={1} className="ml-3 flex-1 text-neutrals-900">
                  {profile.name}
                </Typography>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </ActionSheet>
  );
}

