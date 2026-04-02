import type { BarcodeLookupProduct, BarcodeLookupResponse } from '@acme/shared';
import { COLORS } from '../../../../shared/constants/colors';
import { resolveStorageUri } from '../../../../shared/lib/storage/resolveStorageUri';
import type { ScannerMutationResponse } from '../../types/scanner';

type GradeKey = 'a' | 'b' | 'c' | 'd' | 'e';

interface GradeTone {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
}

const GRADE_TONES: Record<GradeKey, GradeTone> = {
  a: { backgroundColor: COLORS.success, textColor: COLORS.white, borderColor: COLORS.success },
  b: { backgroundColor: COLORS.primary, textColor: COLORS.white, borderColor: COLORS.primary },
  c: { backgroundColor: COLORS.sparkle, textColor: COLORS.gray900, borderColor: COLORS.sparkle },
  d: { backgroundColor: COLORS.warning, textColor: COLORS.white, borderColor: COLORS.warning },
  e: { backgroundColor: COLORS.danger, textColor: COLORS.white, borderColor: COLORS.danger },
};

export const isBarcodeLookupResponse = (
  result: ScannerMutationResponse | undefined,
): result is BarcodeLookupResponse => {
  return Boolean(result && 'barcode' in result && 'source' in result);
};

export const hasProductResult = (
  result: BarcodeLookupResponse,
): result is Extract<BarcodeLookupResponse, { success: true }> => {
  return result.success;
};

export const getGradeTone = (grade: string | null | undefined): GradeTone => {
  if (!grade) {
    return {
      backgroundColor: COLORS.gray100,
      textColor: COLORS.gray700,
      borderColor: COLORS.gray200,
    };
  }

  return (
    GRADE_TONES[grade.toLowerCase() as GradeKey] ?? {
      backgroundColor: COLORS.gray100,
      textColor: COLORS.gray700,
      borderColor: COLORS.gray200,
    }
  );
};

export const formatGrade = (grade: string | null | undefined): string => {
  return grade ? grade.toUpperCase() : 'N/A';
};

export const getProductImageUri = (
  product: BarcodeLookupProduct,
  previewImageUri?: string | null,
): string | null => {
  return (
    resolveStorageUri(product.images.front_url) ??
    resolveStorageUri(product.image_url) ??
    previewImageUri ??
    null
  );
};

export const formatLabel = (value: string): string => {
  return value
    .split(' ')
    .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
};

export const getNutritionTone = (key: string, value: number | null): string => {
  if (value == null) {
    return COLORS.gray500;
  }

  if (key === 'proteins_100g' || key === 'fiber_100g') {
    return value >= 3 ? COLORS.success : COLORS.gray700;
  }

  if (key === 'sugars_100g') {
    return value >= 10 ? COLORS.warning : COLORS.gray700;
  }

  if (key === 'salt_100g' || key === 'sodium_100g' || key === 'saturated_fat_100g') {
    return value >= 1 ? COLORS.danger : COLORS.gray700;
  }

  return COLORS.gray700;
};
