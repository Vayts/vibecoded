export const normalizeCustomAllergyValue = (value: string | null | undefined): string | null => {
  const normalized = value?.trim().replace(/\s+/g, ' ') ?? '';
  return normalized.length > 0 ? normalized : null;
};

export const buildAllergyDedupeKey = (
  allergy: string | null | undefined,
  customAllergy?: string | null,
): string | null => {
  if (!allergy) return null;

  if (allergy === 'OTHER') {
    const customKey = normalizeCustomAllergyValue(customAllergy)?.toLowerCase();
    return customKey ? `OTHER:${customKey}` : null;
  }

  return allergy;
};
