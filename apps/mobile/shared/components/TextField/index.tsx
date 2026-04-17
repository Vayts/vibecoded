import { Lock } from 'lucide-react-native';
import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { COLORS } from '../../constants/colors';
import { Typography } from '../Typography';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  containerClassName?: string;
  editable?: boolean;
  error?: string | null;
  label?: string;
  minHeight?: number;
  showLockIcon?: boolean;
}

export function TextField({
  containerClassName,
  editable = true,
  error,
  label,
  minHeight,
  multiline,
  onBlur,
  onFocus,
  showLockIcon = true,
  ...props
}: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  const inputClassName = [
    multiline ? 'min-h-[56px] py-4' : 'h-[48px]',
    'rounded-2xl pl-4 text-[17px] text-neutrals-900',
    editable ? 'pr-4' : 'pr-12',
    error ? 'border border-red-300' : 'border border-transparent',
    editable ? 'bg-neutrals-100' : 'bg-neutrals-100 text-neutrals-700',
  ].join(' ');

  const handleBlur: NonNullable<TextInputProps['onBlur']> = (event) => {
    setIsFocused(false);
    onBlur?.(event);
  };

  const handleFocus: NonNullable<TextInputProps['onFocus']> = (event) => {
    setIsFocused(true);
    onFocus?.(event);
  };

  return (
    <View className={containerClassName}>
      {label ? (
        <Typography variant="bodySecondary" className="mb-2 font-semibold text-neutrals-500">
          {label}
        </Typography>
      ) : null}

      <View className="relative" style={{ opacity: editable ? 1 : 0.4 }}>
        {editable && isFocused ? (
          <View
            className="absolute -inset-1 rounded-[16px]"
            pointerEvents="none"
            style={{ borderWidth: 1, borderColor: COLORS.primary700 }}
          />
        ) : null}

        <TextInput
          editable={editable}
          multiline={multiline}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholderTextColor={COLORS.gray400}
          className={inputClassName}
          style={
            multiline
              ? [{ minHeight: minHeight ?? 120, textAlignVertical: 'top' as const }]
              : undefined
          }
          {...props}
        />

        {!editable && showLockIcon ? (
          <View
            className="absolute right-4 inset-y-0 justify-center"
            accessible={false}
            pointerEvents="none"
          >
            <Lock color={COLORS.neutrals500} size={18} strokeWidth={2} />
          </View>
        ) : null}
      </View>

      {error ? (
        <Typography variant="bodySecondary" className="mt-1 text-red-500">
          {error}
        </Typography>
      ) : null}
    </View>
  );
}