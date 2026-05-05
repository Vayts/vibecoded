import { View } from 'react-native';
import { ComparisonSummaryChip } from './ComparisonSummaryChip';
import { Typography } from '../../../../shared/components/Typography';
import type { CompareFact, ProfileCompareResult } from '../../utils/profileCompareTypes';
import { getComparedProductDisplayName } from './comparisonResultHelpers';

interface ComparisonExplanationSectionProps {
  profileResult: ProfileCompareResult;
}

type DisplayChip = { iconKey?: string | null; text: string };

const getTargetLabel = (profileName: string) =>
  profileName.trim().toLowerCase() === 'you' ? 'you' : profileName;

const simplifyChipText = (text: string): string => {
  const simplified = text
    .replace(/\([^)]*\d[^)]*\)/g, '')
    .replace(/:\s*.*\d.*$/g, '')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:kcal|kj|mg|g|grams?)\b/gi, '')
    .replace(/\bvs\.?\b.*$/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/[,:;.\-–—\s]+$/g, '')
    .trim();

  return simplified || text.trim();
};

const toDisplayChip = (text: string, iconKey?: string | null): DisplayChip => ({
  iconKey,
  text: simplifyChipText(text),
});

const dedupeChips = (items: DisplayChip[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.text.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const getFactIconKey = (fact: CompareFact): string | null => {
  if (fact.key === 'diet-match' || fact.category === 'restrictions') return 'diet-match';
  return fact.key;
};

const factsToChips = (facts: CompareFact[]): DisplayChip[] =>
  facts.map((fact) => toDisplayChip(fact.label, getFactIconKey(fact)));

const getTitle = (profileResult: ProfileCompareResult, targetLabel: string) => {
  if (profileResult.status === 'no_suitable_product') {
    return `No suitable product for ${targetLabel}`;
  }

  if (profileResult.status === 'equivalent') {
    return `Both products are similarly suitable for ${targetLabel}`;
  }

  return `Why is ${getComparedProductDisplayName(profileResult.winner)} a better fit for ${targetLabel}?`;
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

export function ComparisonExplanationSection({ profileResult }: ComparisonExplanationSectionProps) {
  const targetLabel = getTargetLabel(profileResult.displayName);
  const title = getTitle(profileResult, targetLabel);
  const description = getDescription(profileResult);
  const primaryChips = dedupeChips(factsToChips(profileResult.winnerBestAt));
  const secondaryChips = dedupeChips(factsToChips(profileResult.anotherProductMayBeBetterAt));
  const secondaryTitle =
    profileResult.status === 'no_suitable_product'
      ? null
      : profileResult.otherProduct && secondaryChips.length > 0
        ? `${getComparedProductDisplayName(profileResult.otherProduct)} may be better at:`
        : null;

  return (
    <View className="pt-4">
      <Typography
        variant="sectionTitle"
        className="text-[16px] leading-7 text-neutrals-900 font-bold"
      >
        {title}
      </Typography>

      {description?.trim() ? (
        <Typography variant="body" className="mt-4 leading-7 text-neutrals-700">
          {description}
        </Typography>
      ) : null}

      <ChipGroup
        items={primaryChips}
        variant={profileResult.status === 'no_suitable_product' ? 'negative' : 'primary'}
      />

      {secondaryTitle ? (
        <View className="pt-6">
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
