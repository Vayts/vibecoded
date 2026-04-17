import type { ReactNode } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

type ResultSheetActionTone = 'default' | 'destructive';

interface ResultSheetActionButtonProps {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: ResultSheetActionTone;
}

export function ResultSheetActionButton({
  label,
  icon,
  onPress,
  disabled = false,
  loading = false,
  tone = 'default',
}: ResultSheetActionButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      accessibilityRole="button"
      className={`min-h-[44px] w-full rounded-full border bg-white px-5 ${isDisabled ? 'opacity-40' : ''}`}
      style={{ borderColor: COLORS.neutrals300 }}
      disabled={isDisabled}
      onPress={onPress}
    >
      <View className="min-h-[44px] flex-row items-center justify-center gap-2.5">
        {loading ? (
          <ActivityIndicator
            color={tone === 'destructive' ? COLORS.danger800 : COLORS.neutrals900}
            size="small"
          />
        ) : (
          <>
            {icon}
            <Typography
              variant="button"
              className={tone === 'destructive' ? 'text-danger-800' : 'text-neutrals-900'}
            >
              {label}
            </Typography>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}