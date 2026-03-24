import { TouchableOpacity, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { COLORS } from '../../../../shared/constants/colors';
import { Typography } from '../../../../shared/components/Typography';

interface SelectableChipProps {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}

export function SelectableChip({ label, description, selected, onPress }: SelectableChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      className={`rounded-2xl border px-4 py-4 ${selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}
      onPress={onPress}
    >
      <View className="flex-row items-start gap-3">
        <View
          className={`mt-0.5 h-5 w-5 items-center justify-center rounded-full border ${selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'}`}
        >
          {selected ? <Check size={12} color={COLORS.white} /> : null}
        </View>
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
      </View>
    </TouchableOpacity>
  );
}
