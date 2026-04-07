import type { ComparisonProductPreview, ProfileComparisonResult } from '@acme/shared';
import { View } from 'react-native';
import { Check, X, Minus, AlertTriangle, ShieldX, Trophy } from 'lucide-react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface VerdictCardProps {
  profile: ProfileComparisonResult;
  product1: ComparisonProductPreview;
  product2: ComparisonProductPreview;
}

export function VerdictCard({ profile, product1, product2 }: VerdictCardProps) {
  const isNeither = profile.winner === 'neither';
  const isTie = profile.winner === 'tie';
  const winnerProduct = profile.winner === 'product1' ? product1 : product2;
  const winnerLabel = profile.winner === 'product1' ? 'A' : 'B';
  const winnerComparison =
    profile.winner === 'product1' ? profile.product1 : profile.product2;
  const loserComparison =
    profile.winner === 'product1' ? profile.product2 : profile.product1;

  // Neither product is suitable
  if (isNeither) {
    const uniqueNegatives = [...new Set([
      ...profile.product1.negatives,
      ...profile.product2.negatives,
    ])];

    return (
      <View className="rounded-2xl border border-gray-100 bg-white px-4 py-4">
        <View className="mb-3 flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-red-50">
            <ShieldX size={18} color={COLORS.danger} strokeWidth={1.8} />
          </View>
          <View className="flex-1">
            <Typography variant="headerTitle">Neither product fits</Typography>
            <Typography variant="caption" className="text-gray-400">
              Both have compatibility issues
            </Typography>
          </View>
        </View>

        <Typography variant="bodySecondary" className="mb-3 text-gray-600">
          {profile.conclusion}
        </Typography>

        {uniqueNegatives.length > 0 ? (
          <View className="rounded-xl bg-gray-50 px-3 py-2.5">
            {uniqueNegatives.map((text, i) => (
              <View key={`neg-${i}`} className="flex-row items-start gap-2.5 py-1">
                <X size={14} color={COLORS.danger} strokeWidth={2} style={{ marginTop: 1 }} />
                <Typography variant="bodySecondary" className="flex-1 text-gray-600">
                  {text}
                </Typography>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  // Tie
  if (isTie) {
    return (
      <View className="rounded-2xl border border-gray-100 bg-white px-4 py-4">
        <View className="mb-2 flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-gray-100">
            <Minus size={18} color={COLORS.gray500} strokeWidth={1.8} />
          </View>
          <Typography variant="headerTitle">It's a tie</Typography>
        </View>
        <Typography variant="bodySecondary" className="text-gray-600">
          {profile.conclusion}
        </Typography>
      </View>
    );
  }

  // Winner
  const advantages = winnerComparison.positives;
  const tradeoffs = winnerComparison.negatives;

  return (
    <View className="rounded-2xl border border-gray-100 bg-white px-4 py-4">
      {/* Header */}
      <View className="mb-3 flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-green-50">
          <Trophy size={18} color={COLORS.success} strokeWidth={1.8} />
        </View>
        <View className="flex-1">
          <Typography variant="caption" className="text-gray-400">
            Better choice
          </Typography>
          <Typography variant="headerTitle">
            {winnerProduct.product_name ?? `Product ${winnerLabel}`}
          </Typography>
        </View>
      </View>

      {/* Advantages */}
      {advantages.length > 0 ? (
        <View className="mb-3 rounded-xl bg-gray-50 px-3 py-2.5">
          {advantages.map((text, i) => (
            <View key={`adv-${i}`} className="flex-row items-start gap-2.5 py-1">
              <Check size={14} color={COLORS.success} strokeWidth={2} style={{ marginTop: 1 }} />
              <Typography variant="bodySecondary" className="flex-1 text-gray-700">
                {text}
              </Typography>
            </View>
          ))}
        </View>
      ) : null}

      {/* Trade-offs */}
      {tradeoffs.length > 0 ? (
        <View className="mb-3 rounded-xl bg-gray-50 px-3 py-2.5">
          {tradeoffs.map((text, i) => (
            <View key={`tradeoff-${i}`} className="flex-row items-start gap-2.5 py-1">
              <AlertTriangle size={14} color={COLORS.gray400} strokeWidth={2} style={{ marginTop: 1 }} />
              <Typography variant="bodySecondary" className="flex-1 text-gray-500">
                {text}
              </Typography>
            </View>
          ))}
        </View>
      ) : null}

      {/* Other product advantages */}
      {loserComparison.positives.length > 0 ? (
        <View className="border-t border-gray-100 pt-3">
          <Typography variant="caption" className="mb-1.5 text-gray-400">
            The other product is better at
          </Typography>
          {loserComparison.positives.map((text, i) => (
            <View key={`loser-${i}`} className="flex-row items-start gap-2.5 py-0.5">
              <View className="mt-1.5 h-1 w-1 rounded-full bg-gray-300" />
              <Typography variant="caption" className="flex-1 text-gray-400">
                {text}
              </Typography>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
