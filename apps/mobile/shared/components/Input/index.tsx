import { TextInput, View, type TextInputProps } from 'react-native';
import { COLORS } from '../../constants/colors';
import { Typography } from '../Typography';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  multiline?: boolean;
  minHeight?: number;
}

export function Input({ label, error, multiline, minHeight, ...props }: InputProps) {
  return (
    <View>
      {label ? (
        <Typography variant="body" className="mb-2">
          {label}
        </Typography>
      ) : null}
      <TextInput
        className={`bg-gray-50 rounded-xl p-4 text-base text-gray-900 border ${error ? 'border-red-300' : 'border-gray-200'}`}
        style={
          multiline && minHeight ? [{ minHeight, textAlignVertical: 'top' as const }] : undefined
        }
        placeholderTextColor={COLORS.gray400}
        multiline={multiline}
        {...props}
      />
      {error ? (
        <Typography variant="bodySecondary" className="text-red-500 mt-1">
          {error}
        </Typography>
      ) : null}
    </View>
  );
}
