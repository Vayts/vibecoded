import { memo } from 'react';
import { Search, X } from 'lucide-react-native';
import { TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../../../shared/constants/colors';

interface ScansSearchInputProps {
  value: string;
  onChangeText: (value: string) => void;
  className?: string;
}

export const ScansSearchInput = memo(function ScansSearchInput({
  value,
  onChangeText,
  className,
}: ScansSearchInputProps) {
  return (
    <View className={className}>
      <View
        className="flex-row items-center rounded-full px-4"
        style={{
          height: 44,
          backgroundColor: COLORS.neutrals100,
        }}
      >
        <Search color={COLORS.neutrals500} size={20} strokeWidth={2} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Search"
          placeholderTextColor={COLORS.neutrals500}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
          selectionColor={COLORS.primary}
          className="ml-3 flex-1 py-0 text-[16px] text-neutrals-500"
        />
        {value ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            activeOpacity={0.7}
            onPress={() => onChangeText('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X color={COLORS.gray400} size={18} strokeWidth={2.25} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
});