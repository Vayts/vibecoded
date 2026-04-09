import { TouchableOpacity, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import type { ScannerMode } from './ScannerModeSwitch';

interface ScannerBottomBarProps {
  mode: ScannerMode;
  isCompareMode: boolean;
  isLocked: boolean;
  onCapturePress: () => void;
  onCancelCompare: () => void;
}

export function ScannerBottomBar({
  mode,
  isCompareMode,
  isLocked,
  onCapturePress,
  onCancelCompare,
}: ScannerBottomBarProps) {
  return (
    <View className="items-center justify-end" style={{ minHeight: mode === 'photo' || isCompareMode ? 132 : 56 }}>
      {isCompareMode ? (
        <TouchableOpacity
          accessibilityLabel="Cancel comparison"
          accessibilityRole="button"
          activeOpacity={0.7}
          className="mb-4 rounded-full bg-black/50 px-4 py-3"
          onPress={onCancelCompare}
        >
          <Typography variant="buttonSmall" className="text-white">
            Cancel comparison
          </Typography>
        </TouchableOpacity>
      ) : null}

      {mode === 'photo' ? (
        <TouchableOpacity
          accessibilityLabel="Take product photo"
          accessibilityRole="button"
          activeOpacity={0.7}
          disabled={isLocked}
          style={{ opacity: isLocked ? 0.4 : 1 }}
          onPress={onCapturePress}
        >
          <View className="h-20 w-20 items-center justify-center rounded-full border-[3px] border-white">
            <View className="h-[68px] w-[68px] rounded-full bg-white" />
          </View>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
