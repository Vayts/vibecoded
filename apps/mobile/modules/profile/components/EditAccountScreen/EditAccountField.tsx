import { useState } from 'react';
import { Lock } from 'lucide-react-native';
import { TextInput, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface EditAccountFieldProps {
  editable?: boolean;
  error?: string | null;
  label: string;
  onChangeText?: (value: string) => void;
  value: string;
}

export function EditAccountField({
  editable = true,
  error,
  label,
  onChangeText,
  value,
}: EditAccountFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="mt-5">
      <Typography variant="bodySecondary" className="mb-2 font-semibold text-neutrals-500">
        {label}
      </Typography>
      <View className="relative" style={{ opacity: editable ? 1 : 0.4 }}>
        {editable && isFocused ? (
          <View
            className="absolute -inset-1 rounded-[16px]"
            pointerEvents="none"
            style={{ borderWidth: 1, borderColor: COLORS.primary700 }}
          />
        ) : null}

        <TextInput
          value={value}
          editable={editable}
          onChangeText={onChangeText}
          onBlur={() => {
            setIsFocused(false);
          }}
          onFocus={() => {
            setIsFocused(true);
          }}
          placeholderTextColor={COLORS.gray400}
          className={`h-14 rounded-2xl pl-4 text-[17px] text-neutrals-900 ${editable ? 'pr-4' : 'pr-12'} ${error ? 'border border-red-300' : 'border border-transparent'} ${editable ? 'bg-neutrals-100' : 'bg-neutrals-100 text-neutrals-700'}`}
        />

        {!editable ? (
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
