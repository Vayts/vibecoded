import { View } from 'react-native';
import { ComparisonSummaryChip } from './ComparisonSummaryChip';
import { Typography } from '../../../../shared/components/Typography';
import type { ProfileCompareResult } from '../../utils/profileCompareTypes';
import {
  dedupeChips,
  factsToChips,
  getComparedProductDisplayName,
  getNoSuitableProductChips,
  getTargetLabel,
  type DisplayChip,
} from './comparisonResultHelpers';

interface ComparisonExplanationSectionProps {
  hidePrimaryDetails?: boolean;
  profileResult: ProfileCompareResult;
}

const getTitle = (profileResult: ProfileCompareResult, targetLabel: string) => {
  if (profileResult.status === 'no_suitable_product') {
    return `No suitable product for ${targetLabel}`;
  }

  if (profileResult.status === 'equivalent') {
    return `Both products are similarly suitable for ${targetLabel}`;
  }

  return null;
};

const getDescription = (profileResult: ProfileCompareResult) => {
  if (profileResult.status === 'no_suitable_product') {
    return 'Neither product is recommended for this profile.';
  }

  if (profileResult.status === 'equivalent') {
    return 'The products are close across safety, goal fit, and nutrition. Review the strengths below to choose what matters most.';
  }

  return profileResult.winner?.analysis.overall?.summary ?? null;
};

function ChipGroup({
  items,
  variant,
}: {
  items: DisplayChip[];
  variant: 'primary' | 'secondary' | 'negative';
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View className="mt-4 flex-row flex-wrap gap-2">
      {items.map((item, index) => (
        <ComparisonSummaryChip
          key={`${item.text}-${index}`}
          iconKey={item.iconKey}
          text={item.text}
          variant={variant}
        />
      ))}
    </View>
  );
}

export function ComparisonExplanationSection({
  hidePrimaryDetails = false,
  profileResult,
}: ComparisonExplanationSectionProps) {
  const targetLabel = getTargetLabel(profileResult.displayName);
  const title = getTitle(profileResult, targetLabel);
  const description = getDescription(profileResult);
  const primaryChips =
    profileResult.status === 'no_suitable_product'
      ? getNoSuitableProductChips(profileResult)
      : dedupeChips(factsToChips(profileResult.winnerBestAt));
  const secondaryChips = dedupeChips(factsToChips(profileResult.anotherProductMayBeBetterAt));
  const secondaryTitle =
    profileResult.status === 'no_suitable_product'
      ? null
      : profileResult.otherProduct && secondaryChips.length > 0
        ? `${getComparedProductDisplayName(profileResult.otherProduct)} may be better at:`
        : null;

  return (
    <View className="pt-2">
      {title ? (
        <Typography
          variant="sectionTitle"
          className="text-[16px] leading-7 mt-2 text-neutrals-900 font-bold"
        >
          {title}
        </Typography>
      ) : null}

      {!hidePrimaryDetails && description?.trim() ? (
        <Typography variant="body" className="mt-2 leading-7 text-neutrals-700">
          {description}
        </Typography>
      ) : null}

      {!hidePrimaryDetails ? (
        <ChipGroup
          items={primaryChips}
          variant={profileResult.status === 'no_suitable_product' ? 'negative' : 'primary'}
        />
      ) : null}

      {secondaryTitle ? (
        <View className="pt-2">
          <Typography
            variant="sectionTitle"
            className="text-[16px] leading-7 text-neutrals-900 font-bold"
          >
            {secondaryTitle}
          </Typography>
          <ChipGroup items={secondaryChips} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}
