import { Sparkle } from 'lucide-react-native';
import { View } from 'react-native';
import { COLORS } from '../../../../shared/constants/colors';

export function EvaluationRowIcon() {
  return (
    <View className="h-9 w-9 items-center justify-center">
      <Sparkle size={20} strokeWidth={1.5}/>
    </View>
  );
}
