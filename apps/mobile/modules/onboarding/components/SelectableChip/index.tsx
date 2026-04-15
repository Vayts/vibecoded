import { TouchableOpacity, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { COLORS } from '../../../../shared/constants/colors';
import { Typography } from '../../../../shared/components/Typography';

interface SelectableChipProps {
  label: string;
  description?: string;
  selected: boolean;
  isBig?: boolean;
  onPress: () => void;
  withCheckIcon?: boolean;
}

export function SelectableChip({
  label,
  description,
  selected,
  isBig,
  onPress,
  withCheckIcon = false,
}: SelectableChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      className={`relative rounded-xl border ${selected ? 'border-transparent' : 'border-neutrals-200'} bg-white px-4 py-4 ${isBig ? 'min-h-[62px] items-center justify-center' : 'min-h-auto'}`}
      onPress={onPress}
    >
      {selected ? (
        <View
          pointerEvents="none"
          className="absolute inset-0 rounded-xl border-2 border-accent-600"
        />
      ) : null}

      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Typography variant="body" className="font-semibold text-gray-900">
            {label}
          </Typography>
          {description ? (
            <Typography variant="bodySecondary" className="mt-1 leading-5 text-gray-500">
              {description}
            </Typography>
          ) : null}
        </View>

        <View
          className={`mt-0.5 h-5 w-5 items-center justify-center rounded-full border ${selected && withCheckIcon ? 'border-accent-600 bg-accent-600' : selected ? 'border-accent-600 bg-transparent' : 'border-gray-300 bg-white'}`}
        >
          {selected ? (
            withCheckIcon ? (
              <Check color={COLORS.white} size={12} strokeWidth={3} />
            ) : (
              <View className="h-3.5 w-3.5 rounded-full bg-accent-600" />
            )
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}
