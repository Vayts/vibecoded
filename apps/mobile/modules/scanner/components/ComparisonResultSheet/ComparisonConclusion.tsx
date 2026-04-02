import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface ComparisonConclusionProps {
  conclusion: string;
  winner: string;
}

export function ComparisonConclusion({ conclusion, winner }: ComparisonConclusionProps) {
  const isTie = winner === 'tie';

  return (
    <View
      className="rounded-2xl border px-4 py-4"
      style={{
        borderColor: isTie ? COLORS.gray200 : COLORS.successBorder,
        backgroundColor: isTie ? COLORS.gray50 : COLORS.successSoft,
      }}
    >
      <Typography variant="caption" className="mb-1 font-semibold uppercase tracking-wide text-gray-400">
        Conclusion
      </Typography>
      <Typography variant="body" style={{ color: isTie ? COLORS.gray700 : COLORS.success }}>
        {conclusion}
      </Typography>
    </View>
  );
}
