import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { getFitLabelText, getRatingTone } from './evaluationHelpers';

interface ScoreSummaryProps {
  title: string;
  score: number;
  label: string;
  toneKey: 'excellent' | 'good' | 'average' | 'bad';
}

export function ScoreSummary({ title, score, label, toneKey }: ScoreSummaryProps) {
  const tone = getRatingTone(toneKey);

  return (
    <View
      className="mt-4 rounded-xl border bg-white px-4 py-4"
      style={{ borderColor: tone.borderColor }}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View>
          <Typography variant="fieldLabel" style={{ color: tone.mutedTextColor }}>
            {title}
          </Typography>
          <Typography variant="bodySecondary" className="mt-1" style={{ color: tone.textColor }}>
            {getFitLabelText(label)}
          </Typography>
        </View>

        <View className="items-end">
          <Typography variant="pageTitle" style={{ color: tone.textColor }}>
            {score}/100
          </Typography>
        </View>
      </View>
    </View>
  );
}
