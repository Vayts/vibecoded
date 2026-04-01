interface CanonicalProductTextInput {
  productName?: string | null;
  brand?: string | null;
}

const normalizeSegment = (value?: string | null): string => {
  if (!value) {
    return '';
  }

  return value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
};

export const buildCanonicalProductText = ({
  productName,
  brand,
}: CanonicalProductTextInput): string | null => {
  const normalizedName = normalizeSegment(productName);
  const normalizedBrand = normalizeSegment(brand);
  const parts = [normalizedName, normalizedBrand].filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  return parts.join(' ');
};