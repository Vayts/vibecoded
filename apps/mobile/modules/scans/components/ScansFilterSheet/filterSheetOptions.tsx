import { GOOD_FIT_SCORE_MIN, NEUTRAL_FIT_SCORE_MIN, type ScanFitBucket } from '@acme/shared';
import { Check, CircleAlert, HeartCrack, HeartHandshake, type LucideProps } from 'lucide-react-native';
import type { ForwardRefExoticComponent } from 'react';
import { View } from 'react-native';
import { COLORS } from '../../../../shared/constants/colors';

export const toggleSelection = (items: string[], value: string) =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

export const SelectionIndicator = ({ selected }: { selected: boolean }) => (
  <View
    className={`h-7 w-7 items-center justify-center rounded-full border ${selected ? 'border-primary-900 bg-primary-900' : 'border-gray-300 bg-white'}`}
  >
    {selected ? <Check color={COLORS.white} size={16} strokeWidth={2.5} /> : null}
  </View>
);

export const SCORE_OPTIONS: Array<{
  key: ScanFitBucket;
  label: string;
  description: string;
  color: string;
  iconColor: string;
  backgroundColor: string;
  Icon: ForwardRefExoticComponent<LucideProps>;
}> = [
  {
    key: 'bad',
    label: 'Bad',
    description: `<${NEUTRAL_FIT_SCORE_MIN}`,
    color: COLORS.danger,
    backgroundColor: COLORS.dangerSoft,
    iconColor: COLORS.danger800,
    Icon: HeartCrack,
  },
  {
    key: 'neutral',
    label: 'Worth considering',
    description: `${NEUTRAL_FIT_SCORE_MIN}-${GOOD_FIT_SCORE_MIN - 1}`,
    color: COLORS.neutrals700,
    backgroundColor: COLORS.neutrals100,
    iconColor: COLORS.neutrals700,
    Icon: CircleAlert,
  },
  {
    key: 'good',
    label: 'Good',
    description: `${GOOD_FIT_SCORE_MIN}+`,
    color: COLORS.primary900,
    backgroundColor: COLORS.successSoft,
    iconColor: COLORS.success,
    Icon: HeartHandshake,
  },
];

