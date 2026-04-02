import { Camera } from 'lucide-react-native';
import { TouchableOpacity, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface ScannerBottomBarProps {
  isCompareMode: boolean;
  isLocked: boolean;
  submitMessage: string | null;
  onPhotoPress: () => void;
  onCancelCompare: () => void;
}

export function ScannerBottomBar({
  isCompareMode,
  isLocked,
  submitMessage,
  onPhotoPress,
  onCancelCompare,
}: ScannerBottomBarProps) {
  return (
    <View className="gap-3">
      <View className="flex-row items-end">
        <TouchableOpacity
          accessibilityLabel="Take product photo"
          accessibilityRole="button"
          activeOpacity={0.7}
          disabled={isCompareMode || isLocked}
          className="h-12 w-12 items-center mb-10 ml-4 justify-center rounded-full bg-black/50"
          style={{ opacity: isCompareMode || isLocked ? 0 : 1 }}
          onPress={onPhotoPress}
        >
          <Camera color={COLORS.white} size={22} />
        </TouchableOpacity>

        <View className="flex-1 items-center">
          {isCompareMode ? (
            <TouchableOpacity
              accessibilityLabel="Cancel comparison"
              accessibilityRole="button"
              activeOpacity={0.7}
              className="rounded-full bg-black/50 px-4 py-3"
              onPress={onCancelCompare}
            >
              <Typography variant="buttonSmall" className="text-white">
                Cancel comparison
              </Typography>
            </TouchableOpacity>
          ) : null}
        </View>

        <View className="w-12" />
      </View>

      {submitMessage ? (
        <Typography variant="bodySecondary" className="text-center text-red-300">
          {submitMessage}
        </Typography>
      ) : null}
    </View>
  );
}
