import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import CrossIcon from '../../../../assets/icons/cross.svg';
import CheckIcon from '../../../../assets/icons/check.svg';

interface CanIHaveThisCardProps {
  can: boolean;
  reason: string;
}

export function CanIHaveThisCard({ can, reason }: CanIHaveThisCardProps) {
  const Icon = can ? CheckIcon : CrossIcon;

  return (
    <View
      className="mt-4 rounded-[20px] border flex-row gap-3 px-4 py-4 border-neutral-200"
    >
      <View className="flex-row items-center">
        <Icon width={32} height={32} />
      </View>
      <View className="flex-shrink">
        <Typography className="text-[14px] font-semibold text-neutrals-900">
          Can I have this?
        </Typography>
        <Typography className="mt-1 text-[12px] flex-shrink text-neutrals-800">
          {reason}
        </Typography>
      </View>
    </View>
  );
}

