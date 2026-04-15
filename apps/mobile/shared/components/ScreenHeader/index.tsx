import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '../BackButton';
import { Typography } from '../Typography';

interface ScreenHeaderProps {
  centerTitle?: boolean;
  title?: string;
  rightAction?: React.ReactNode;
}

export function ScreenHeader({ centerTitle = false, title, rightAction }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="bg-white" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center py-2">
        <BackButton />

        {centerTitle ? (
          <>
            <View className="flex-1 items-center px-2">
              {title ? (
                <Typography variant="headerTitle" className="text-[16px]" numberOfLines={1}>
                  {title}
                </Typography>
              ) : null}
            </View>
            <View className="w-11 items-end justify-center">{rightAction}</View>
          </>
        ) : (
          <>
            {title ? (
              <Typography variant="headerTitle" className="ml-1 flex-1" numberOfLines={1}>
                {title}
              </Typography>
            ) : (
              <View className="flex-1" />
            )}
            {rightAction ? <View className="ml-auto">{rightAction}</View> : null}
          </>
        )}
      </View>
    </View>
  );
}
