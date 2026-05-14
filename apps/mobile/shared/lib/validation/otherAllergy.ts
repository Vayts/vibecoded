import { OTHER_ALLERGY_DETAILS_REQUIRED_MESSAGE } from '@acme/shared';

interface OtherAllergyInput {
  allergies: readonly string[];
  otherAllergiesText: string | null | undefined;
}

export const normalizeOtherAllergyText = ({
  allergies,
  otherAllergiesText,
}: OtherAllergyInput): string | null => {
  if (!allergies.includes('OTHER')) {
    return null;
  }

  const trimmedText = otherAllergiesText?.trim() ?? '';
  return trimmedText.length > 0 ? trimmedText : null;
};

export const getOtherAllergyValidationError = (
  input: OtherAllergyInput,
): string | null => {
  if (!input.allergies.includes('OTHER')) {
    return null;
  }

  return normalizeOtherAllergyText(input)
    ? null
    : OTHER_ALLERGY_DETAILS_REQUIRED_MESSAGE;
};

export const hasValidOtherAllergySelection = (input: OtherAllergyInput): boolean => {
  return getOtherAllergyValidationError(input) === null;
};