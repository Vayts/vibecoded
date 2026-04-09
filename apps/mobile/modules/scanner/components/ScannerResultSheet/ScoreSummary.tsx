import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { getFitLabelText } from './evaluationHelpers';
import { Sparkles } from 'lucide-react-native';

interface ScoreSummaryProps {
  title: string;
  score: number;
  label: string;
  toneKey: 'excellent' | 'good' | 'average' | 'bad';
}

const SCORE_SUMMARY_LABEL_COLORS: Record<ScoreSummaryProps['toneKey'], string> = {
  excellent: COLORS.primary,
  good: COLORS.primary,
  average: COLORS.warning,
  bad: COLORS.danger,
};

export function ScoreSummary({ title, score, label, toneKey }: ScoreSummaryProps) {
  const fitLabelColor = SCORE_SUMMARY_LABEL_COLORS[toneKey];

  return (
    <View
      className="mt-4 overflow-hidden rounded-[16px] bg-white"
      style={{ borderWidth: 1, borderColor: COLORS.gray200 }}
    >
      <View
        className="flex-row items-center px-5 py-3 bg-neutrals-100 gap-2"
      >
        <Sparkles size={16} color={COLORS.neutrals500} strokeWidth={1.8} />
        <Typography
          style={{ color: COLORS.neutrals500, fontWeight: '500' }}
        >
          {title}
        </Typography>
      </View>

      <View className="px-4 pt-2 pb-4">
        <Typography
          style={{
            color: COLORS.neutrals900,
            fontSize: 24,
            fontWeight: '700',
          }}
        >
          {score}/100
        </Typography>
        <Typography
          style={{
            color: fitLabelColor,
            fontSize: 14,
            marginTop: 2,
            fontWeight: '600',
          }}
        >
          {getFitLabelText(label)}
        </Typography>
      </View>
    </View>
  );
}
