import type {
  BarcodeLookupProduct,
  DietCompatibility,
  DietKey,
  OnboardingResponse,
  ProductAnalysisResult,
  ProductPreview,
  ScanHistoryItem,
} from '@acme/shared';
import { useMemo } from 'react';
import { useOnboardingQuery } from '../../../onboarding/api/onboardingQueries';
import { useAuthStore } from '../../../../shared/stores/authStore';

export type ProductHeaderData =
  | BarcodeLookupProduct
  | ProductPreview
  | NonNullable<ScanHistoryItem['product']>;

type RestrictionKey = OnboardingResponse['restrictions'][number];
type HeaderChipTone = 'success' | 'warning' | 'danger';

export interface ProductResultHeaderChip {
  key: string;
  label: string;
  tone: HeaderChipTone;
  accessibilityLabel?: string;
}

const MAX_VISIBLE_DIET_CHIPS = 3;

const RESTRICTION_CHIP_CONFIG: Partial<
  Record<RestrictionKey, { dietKey: DietKey; label: string }>
> = {
  VEGAN: { dietKey: 'vegan', label: 'Vegan' },
  VEGETARIAN: { dietKey: 'vegetarian', label: 'Vegetarian' },
  HALAL: { dietKey: 'halal', label: 'Halal' },
  KOSHER: { dietKey: 'kosher', label: 'Kosher' },
  GLUTEN_FREE: { dietKey: 'glutenFree', label: 'Gluten-free' },
  DAIRY_FREE: { dietKey: 'dairyFree', label: 'Dairy-free' },
  NUT_FREE: { dietKey: 'nutFree', label: 'Nut-free' },
};

const getResolvedDietCompatibility = (
  product: ProductHeaderData,
  analysisResult?: ProductAnalysisResult,
): DietCompatibility | undefined => {
  const productCompatibility =
    'dietCompatibility' in product ? product.dietCompatibility : undefined;

  return productCompatibility ?? analysisResult?.productFacts.dietCompatibility;
};

const getCurrentUserNegatives = (analysisResult?: ProductAnalysisResult) => {
  const currentUserProfile =
    analysisResult?.profiles.find((profile) => profile.profileId === 'you') ??
    analysisResult?.profiles[0];

  return currentUserProfile?.negatives ?? [];
};

const buildRestrictionChips = (
  onboarding: OnboardingResponse,
  dietCompatibility?: DietCompatibility,
): ProductResultHeaderChip[] => {
  if (!dietCompatibility) {
    return [];
  }

  return onboarding.restrictions.flatMap<ProductResultHeaderChip>((restriction) => {
    const config = RESTRICTION_CHIP_CONFIG[restriction];
    if (!config) {
      return [];
    }

    const value = dietCompatibility[config.dietKey];

    if (value === 'compatible') {
      return [{ key: `restriction-${restriction}`, label: config.label, tone: 'success' }];
    }

    if (value === 'unclear') {
      return [
        {
          key: `restriction-${restriction}`,
          label: `${config.label} unclear`,
          tone: 'warning',
        },
      ];
    }

    if (value === 'incompatible') {
      return [
        {
          key: `restriction-${restriction}`,
          label: `Not ${config.label.toLowerCase()}`,
          tone: 'danger',
        },
      ];
    }

    return [];
  });
};

const collapseRestrictionChips = (
  chips: ProductResultHeaderChip[],
): ProductResultHeaderChip[] => {
  if (chips.length <= MAX_VISIBLE_DIET_CHIPS) {
    return chips;
  }

  const tone = chips.some((chip) => chip.tone === 'danger')
    ? 'danger'
    : chips.some((chip) => chip.tone === 'warning')
      ? 'warning'
      : 'success';

  const label =
    tone === 'danger'
      ? 'Diet incompatible'
      : tone === 'warning'
        ? 'Diet unclear'
        : 'Diet compatible';

  return [
    {
      key: 'diet-summary',
      label,
      tone,
      accessibilityLabel: label,
    },
  ];
};

const buildAllergenChip = (analysisResult?: ProductAnalysisResult): ProductResultHeaderChip | null => {
  const hasAllergenNegative = getCurrentUserNegatives(analysisResult).some(
    (negative) => negative.source === 'allergen' || negative.category === 'allergens',
  );

  if (!hasAllergenNegative) {
    return null;
  }

  return {
    key: 'allergen-detected',
    label: 'Allergen detected',
    tone: 'danger',
    accessibilityLabel: 'Allergen detected',
  };
};

const buildPreviewAllergenChip = (
  hasAllergenConflict?: boolean,
): ProductResultHeaderChip | null => {
  if (!hasAllergenConflict) {
    return null;
  }

  return {
    key: 'allergen-detected',
    label: 'Allergen detected',
    tone: 'danger',
    accessibilityLabel: 'Allergen detected',
  };
};

export const useProductResultHeaderChips = ({
  analysisResult,
  hasPreviewAllergenConflict,
  product,
}: {
  analysisResult?: ProductAnalysisResult;
  hasPreviewAllergenConflict?: boolean;
  product: ProductHeaderData;
}): ProductResultHeaderChip[] => {
  const authUser = useAuthStore((state) => state.user);
  const onboardingQuery = useOnboardingQuery(authUser?.id);

  return useMemo(() => {
    const onboarding = onboardingQuery.data;
    if (!onboarding) {
      return [];
    }

    const restrictionChips = collapseRestrictionChips(buildRestrictionChips(
      onboarding,
      getResolvedDietCompatibility(product, analysisResult),
    ));
    const allergenChip =
      buildAllergenChip(analysisResult) ??
      buildPreviewAllergenChip(hasPreviewAllergenConflict);

    return allergenChip ? [...restrictionChips, allergenChip] : restrictionChips;
  }, [analysisResult, hasPreviewAllergenConflict, onboardingQuery.data, product]);
};





