import type { ComparisonProductPreview, ProfileComparisonResult } from '@acme/shared';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';

interface VerdictCardProps {
  profile: ProfileComparisonResult;
  product1: ComparisonProductPreview;
  product2: ComparisonProductPreview;
}

export function VerdictCard({ profile, product1, product2 }: VerdictCardProps) {
  const isNeither = profile.winner === 'neither';
  const isTie = profile.winner === 'tie';
  const winnerProduct = profile.winner === 'product1' ? product1 : product2;
  const winnerComparison =
    profile.winner === 'product1' ? profile.product1 : profile.product2;
  const loserComparison =
    profile.winner === 'product1' ? profile.product2 : profile.product1;
  const alternativeStrengths = isNeither
    ? [...profile.product1.negatives, ...profile.product2.negatives]
    : isTie
      ? [...profile.product1.positives, ...profile.product2.positives]
      : loserComparison.positives.length > 0
        ? loserComparison.positives
        : winnerComparison.negatives;
  const uniqueStrengths = [...new Set(alternativeStrengths)].slice(0, 4);

  const explanationTitle = isNeither
    ? 'Why neither product is a good fit'
    : isTie
      ? 'Why these products are closely matched'
      : 'Why is this product better fit for you?';
  const secondaryTitle = isNeither
    ? 'Key compatibility issues:'
    : isTie
      ? 'Important tradeoffs to consider:'
      : 'The other product may be better at:';
  const bodyText =
    isNeither || isTie
      ? profile.conclusion
      : profile.conclusion || `${winnerProduct.product_name ?? 'This product'} is the better fit for this profile.`;

  return (
    <View className="px-1 pt-7">
      <Typography variant="sectionTitle">{explanationTitle}</Typography>
      <Typography variant="body" className="mt-4 text-gray-700">
        {bodyText}
      </Typography>

      {uniqueStrengths.length > 0 ? (
        <View className="mt-4">
          <Typography variant="sectionTitle">{secondaryTitle}</Typography>
          <View className="mt-3">
            {uniqueStrengths.map((text, index) => (
              <View key={`${text}-${index}`} className="flex-row items-start gap-3">
                <Typography variant="body" className="text-gray-500">
                  •
                </Typography>
                <Typography variant="body" className="flex-1 leading-7 text-gray-700">
                  {text}
                </Typography>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
