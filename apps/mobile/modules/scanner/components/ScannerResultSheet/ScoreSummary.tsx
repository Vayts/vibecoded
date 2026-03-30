import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { getFitLabelText, getRatingTone } from './evaluationHelpers';
import { Sparkle, Smile, ThumbsDown } from 'lucide-react-native';

interface ScoreSummaryProps {
  title: string;
  score: number;
  label: string;
  toneKey: 'excellent' | 'good' | 'average' | 'bad';
}

function ToneIcon({ toneKey, color }: { toneKey: ScoreSummaryProps['toneKey']; color: string }) {
  const size = 24;
  if (toneKey === 'bad') return <ThumbsDown size={size} color={color} />;
  if (toneKey === 'average') return <Smile size={size} color={color} />;
  return <Sparkle size={size} color={color} />;
}

export function ScoreSummary({ score, label, toneKey }: ScoreSummaryProps) {
  const tone = getRatingTone(toneKey);

  return (
    <View
      className="mt-4 rounded-xl border border-neutrals-100 bg-white px-4 py-4"
    >
      <View className="flex-row items-center gap-3">
        <View
          className="h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: tone.backgroundColor }}
        >
          <ToneIcon toneKey={toneKey} color={tone.textColor} />
        </View>

        <View>
          <Typography variant="pageTitle" style={{ color: tone.textColor }}>
            {score}/100
          </Typography>
          <Typography variant="bodySecondary" className="mt-1" style={{ color: tone.textColor }}>
            {getFitLabelText(label)}
          </Typography>
        </View>
      </View>
    </View>
  );
}
