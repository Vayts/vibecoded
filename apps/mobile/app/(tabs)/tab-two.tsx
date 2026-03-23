import { View } from 'react-native';
import { Typography } from '../../shared/components/Typography';

export default function TabTwoScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Typography variant="hero" className="mb-3 text-center">
        Tab 2
      </Typography>
      <Typography variant="bodySecondary" className="text-center">
        Second placeholder tab. Add your own feature here.
      </Typography>
    </View>
  );
}
