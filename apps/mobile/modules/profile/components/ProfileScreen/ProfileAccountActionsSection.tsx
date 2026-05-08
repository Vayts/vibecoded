import React from 'react';
import { View } from 'react-native';

import { Typography } from '../../../../shared/components/Typography';
import { ProfileDeleteAccountButton } from '../ProfileDeleteAccountButton';
import { ProfileLogoutButton } from '../ProfileLogoutButton';

interface ProfileAccountActionsSectionProps {
  isPending: boolean;
  onDeleteAccountPress: () => void;
  onLogoutPress: () => void;
}

export function ProfileAccountActionsSection({
  isPending,
  onDeleteAccountPress,
  onLogoutPress,
}: ProfileAccountActionsSectionProps) {
  return (
    <View className="border border-neutrals-200 px-4 pt-4 bg-background flex-1 gap-3 pb-[160px]">
      <ProfileLogoutButton disabled={isPending} onPress={onLogoutPress} />

      <View className="gap-2">
        <View className="flex-row items-center justify-between  gap-2 my-4">
          <View className="flex-1 h-[1px] bg-red-500" />
          <Typography variant="bodySecondary" className="font-semibold text-danger-800">
            Danger zone
          </Typography>
          <View className="flex-1 h-[1px] bg-red-500" />
        </View>
        <ProfileDeleteAccountButton disabled={isPending} onPress={onDeleteAccountPress} />
      </View>
    </View>
  );
}
