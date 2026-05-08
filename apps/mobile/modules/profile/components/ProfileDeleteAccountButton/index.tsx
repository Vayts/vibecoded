import React from 'react';
import { Trash2 } from 'lucide-react-native';
import { TouchableOpacity, View } from 'react-native';

import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface ProfileDeleteAccountButtonProps {
  disabled?: boolean;
  onPress: () => void;
}

export function ProfileDeleteAccountButton({
  disabled = false,
  onPress,
}: ProfileDeleteAccountButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Delete account"
      className="min-h-[44px] rounded-full border border-red-600 px-5 items-center justify-center"
      style={{
        opacity: disabled ? 0.4 : 1,
      }}
      disabled={disabled}
      onPress={onPress}
    >
      <View className="flex-row items-center justify-center">
        <Trash2 color={COLORS.danger800} size={18} strokeWidth={2} />
        <Typography variant="button" className="ml-2 text-danger-800">
          Delete account
        </Typography>
      </View>
    </TouchableOpacity>
  );
}
