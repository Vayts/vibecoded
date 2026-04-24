import React from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';

interface FamilyMembersLockedStateProps {
  title?: string;
  description?: string;
  showBackAction?: boolean;
}

const DEFAULT_TITLE = 'Family members locked';
const DEFAULT_DESCRIPTION =
  'Family members are available only with an active subscription.';

export function FamilyMembersLockedState({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  showBackAction = false,
}: FamilyMembersLockedStateProps) {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Typography variant="sectionTitle" className="text-center text-gray-900">
        {title}
      </Typography>
      <Typography variant="bodySecondary" className="mt-2 text-center text-gray-500">
        {description}
      </Typography>
      {showBackAction ? (
        <View className="mt-6 w-full">
          <Button fullWidth label="Back" variant="secondary" onPress={() => router.back()} />
        </View>
      ) : null}
    </View>
  );
}
