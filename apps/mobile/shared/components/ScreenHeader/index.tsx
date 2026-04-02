import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '../BackButton';
import { Typography } from '../Typography';

interface ScreenHeaderProps {
  title?: string;
  rightAction?: React.ReactNode;
}

export function ScreenHeader({ title, rightAction }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="bg-white" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center py-2">
        <BackButton />
        {title ? (
          <Typography variant="headerTitle" className="ml-1 flex-1" numberOfLines={1}>
            {title}
          </Typography>
        ) : null}
        {rightAction ? <View className="ml-auto">{rightAction}</View> : null}
      </View>
    </View>
  );
}
