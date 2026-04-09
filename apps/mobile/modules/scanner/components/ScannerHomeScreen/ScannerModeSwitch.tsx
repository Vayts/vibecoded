import { TouchableOpacity, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

export type ScannerMode = 'scanner' | 'photo';

interface ScannerModeSwitchProps {
  mode: ScannerMode;
  disabled?: boolean;
  onChange: (mode: ScannerMode) => void;
}

const OPTIONS: Array<{ key: ScannerMode; label: string }> = [
  { key: 'scanner', label: 'Scan barcode' },
  { key: 'photo', label: 'Make photo' },
];

export function ScannerModeSwitch({ mode, disabled = false, onChange }: ScannerModeSwitchProps) {
  return (
    <View className="flex-row rounded-full absolute top-2 bg-black/55 p-1">
      {OPTIONS.map((option) => {
        const isSelected = option.key === mode;

        return (
          <TouchableOpacity
            key={option.key}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ disabled, selected: isSelected }}
            activeOpacity={0.7}
            disabled={disabled}
            className="min-h-[44px] min-w-[110px] items-center justify-center rounded-full px-3"
            style={{
              backgroundColor: isSelected ? COLORS.primary : COLORS.transparent,
              opacity: disabled ? 0.4 : 1,
            }}
            onPress={() => onChange(option.key)}
          >
            <Typography
              variant="buttonSmall"
              style={{ color: COLORS.white, opacity: isSelected ? 1 : 0.85 }}
            >
              {option.label}
            </Typography>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}