import {
  TouchableOpacity,
  ActivityIndicator,
  type TouchableOpacityProps,
  View,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import React from 'react';
import { Typography } from '../Typography';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  label: string;
  fullWidth?: boolean;
  Icon?: React.ReactNode;
}

const variantClasses: Record<
  ButtonVariant,
  { container: string; text: string; indicator: string }
> = {
  primary: {
    container: 'bg-blue-600 rounded-xl',
    text: 'text-white font-semibold text-base',
    indicator: 'white',
  },
  secondary: {
    container: 'border border-gray-300 rounded-xl bg-white',
    text: 'text-gray-700 font-semibold text-base',
    indicator: COLORS.gray700,
  },
  ghost: {
    container: 'rounded-xl',
    text: 'text-blue-600 font-semibold text-base',
    indicator: COLORS.primary,
  },
  destructive: {
    container: 'border border-red-300 rounded-xl bg-white',
    text: 'text-red-600 font-semibold text-base',
    indicator: COLORS.danger,
  },
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'py-2 px-4 h-10',
  md: 'py-3 px-6 h-12',
  lg: 'py-4 px-6 h-14',
};

export function Button({
  variant = 'primary',
  size = 'lg',
  loading = false,
  label,
  fullWidth = false,
  disabled,
  Icon,
  ...props
}: ButtonProps) {
  const styles = variantClasses[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      className={`${styles.container} ${sizeClasses[size]} items-center justify-center ${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-40' : ''}`}
      activeOpacity={0.7}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={styles.indicator} size="small" className="absolute" />
      ) : (
        <View className="flex-row gap-2 items-center">
          {Icon}
          <Typography variant="button" className={styles.text}>
            {label}
          </Typography>
        </View>
      )}
    </TouchableOpacity>
  );
}
