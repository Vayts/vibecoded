import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { COLORS } from '../../constants/colors';

interface ScreenSheetProps {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  marginTop?: number;
  radius?: number;
  shadowRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function ScreenSheet({
  children,
  contentStyle,
  marginTop = 8,
  radius = 32,
  shadowRadius = 4,
  style,
}: ScreenSheetProps) {
  return (
    <View
      style={[
        {
          backgroundColor: COLORS.white,
          borderTopLeftRadius: radius,
          borderTopRightRadius: radius,
          elevation: 8,
          flex: 1,
          gap: 12,
          marginTop,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.1,
          shadowRadius,
        },
        style,
      ]}
    >
      <View
        style={[
          {
            borderTopLeftRadius: radius,
            borderTopRightRadius: radius,
            flex: 1,
            overflow: 'hidden',
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}