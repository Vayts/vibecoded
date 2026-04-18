import type {
  ComparisonProductKey,
  ComparisonProductPreview,
  ProfileComparisonResult,
  ComparisonSummaryItem,
} from '@acme/shared';
import { View } from 'react-native';
import { ComparisonSummaryChip } from './ComparisonSummaryChip';
import { Typography } from '../../../../shared/components/Typography';
import { getProductDisplayName } from './comparisonResultHelpers';

interface ComparisonExplanationSectionProps {
  bestProductKey: ComparisonProductKey | null;
  outcome: 'best-choice' | 'close-match' | 'neutral' | 'no-match';
  product1: ComparisonProductPreview;
  product2: ComparisonProductPreview;
  profile: ProfileComparisonResult;
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

const matchesProduct = (
  item: ComparisonSummaryItem,
  productKey: ComparisonProductKey,
  product: ComparisonProductPreview,
) => item.productKey === productKey || item.productId === product.productId;

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
  bestProductKey,
  outcome,
  product1,
  product2,
  profile,
}: ComparisonExplanationSectionProps) {
  const winnerProduct = bestProductKey === 'product1' ? product1 : bestProductKey === 'product2' ? product2 : null;
  const otherProduct = bestProductKey === 'product1' ? product2 : bestProductKey === 'product2' ? product1 : null;
  const targetLabel = getTargetLabel(profile.profileName);
  const title =
    outcome === 'no-match'
      ? `Why neither product is a good fit for ${targetLabel}`
      : outcome === 'close-match'
        ? `Why are these products closely matched for ${targetLabel}?`
        : winnerProduct
          ? `Why is ${getProductDisplayName(winnerProduct)} better fit for ${targetLabel}?`
          : 'Why this result';

  const summaryItems = profile.comparisonSummary ?? [];
  const winnerSummary = bestProductKey
    ? summaryItems
        .filter((item) => item.tone !== 'negative')
        .filter((item) => matchesProduct(item, bestProductKey, winnerProduct ?? product1))
        .map((item) => toDisplayChip(item.text))
    : [];
  const otherSummary = otherProduct && bestProductKey
    ? summaryItems
        .filter((item) => item.tone !== 'negative')
        .filter((item) => matchesProduct(item, bestProductKey === 'product1' ? 'product2' : 'product1', otherProduct))
        .map((item) => toDisplayChip(item.text))
    : [];
  const negativeSummary = summaryItems
    .filter((item) => item.tone === 'negative')
    .map((item) => toDisplayChip(item.text));

  const primaryChips = dedupeChips(
    outcome === 'no-match'
      ? negativeSummary.length > 0
        ? negativeSummary
        : [...profile.product1.negatives, ...profile.product2.negatives].map((text) => toDisplayChip(text))
      : winnerSummary.length > 0
        ? winnerSummary
        : winnerProduct && bestProductKey
          ? profile[bestProductKey].positives.map((text) => toDisplayChip(text))
          : [],
  );
  const secondaryChips = dedupeChips(
    otherSummary.length > 0
      ? otherSummary
      : otherProduct && bestProductKey
        ? profile[bestProductKey === 'product1' ? 'product2' : 'product1'].positives.map((text) => toDisplayChip(text))
        : [],
  );
  const secondaryTitle =
    outcome === 'no-match'
      ? null
      : otherProduct && secondaryChips.length > 0
        ? `${getProductDisplayName(otherProduct)} may be better at:`
        : null;

  return (
    <View className="pt-4">
      <Typography variant="sectionTitle" className="text-[16px] leading-7 text-neutrals-900 font-bold">
        {title}
      </Typography>

      {profile.conclusion?.trim() ? (
        <Typography variant="body" className="mt-4 leading-7 text-neutrals-700">
          {profile.conclusion}
        </Typography>
      ) : null}

      <ChipGroup items={primaryChips} variant={outcome === 'no-match' ? 'negative' : 'primary'} />

      {secondaryTitle ? (
        <View className="pt-6">
          <Typography variant="sectionTitle" className="text-[16px] leading-7 text-neutrals-900 font-bold">
            {secondaryTitle}
          </Typography>
          <ChipGroup items={secondaryChips} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}