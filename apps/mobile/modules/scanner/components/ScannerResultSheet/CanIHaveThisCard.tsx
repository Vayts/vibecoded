import type { ScannerCanIHaveThisStatus } from '@acme/shared';
import { View } from 'react-native';

import { Typography } from '../../../../shared/components/Typography';
import CrossIcon from '../../../../assets/icons/cross.svg';
import CheckIcon from '../../../../assets/icons/check.svg';
import WarningIcon from '../../../../assets/icons/warning.svg';
import { useMemo } from 'react';
import {
  getCanIRestrictionImage,
} from '../../utils/safetyRestrictionImage';

interface CanIHaveThisCardProps {
  can: boolean;
  status?: ScannerCanIHaveThisStatus;
  reason: string;
  safetyInfo: {
    score: number;
    violatedRestrictions: string[];
    matchedAllergens: string[];
    status: 'avoid' | 'safe' | 'caution';
    reasons: string[];
    traceAllergens: string[];
    traceRestrictions: string[];
  };
}

const getCanIHaveThisIcon = (status: ScannerCanIHaveThisStatus) => {
  if (status === 'warning') return WarningIcon;
  return status === 'yes' ? CheckIcon : CrossIcon;
};

export function CanIHaveThisCard({ can, status, reason, safetyInfo }: CanIHaveThisCardProps) {
  const resolvedStatus: ScannerCanIHaveThisStatus = status ?? (can ? 'yes' : 'no');
  const Icon = getCanIHaveThisIcon(resolvedStatus);
  const CanIIcon = useMemo(() => getCanIRestrictionImage(safetyInfo, status), [safetyInfo, status]);

  return (
    <View className="mt-4 rounded-[20px] border flex-row gap-3 px-4 py-4 border-neutral-200 relative">
      <View className="flex-row items-center">
        <Icon width={32} height={32} />
      </View>
      <View className="flex-shrink mr-[80px]">
        <Typography className="text-[14px] font-semibold text-neutrals-900">
          Can I have this?
        </Typography>
        <Typography className="mt-1 text-[12px] flex-shrink text-neutrals-800">{reason}</Typography>
      </View>
      <View className="absolute bottom-2 right-2">
        {CanIIcon ? <CanIIcon height={80} width={80}/> : null}
      </View>
    </View>
  );
}
