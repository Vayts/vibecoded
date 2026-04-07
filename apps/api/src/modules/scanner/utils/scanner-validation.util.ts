import type { ZodError } from 'zod';

export const getValidationErrorMessage = (
  error: ZodError,
  fallback: string,
): string => {
  return error.issues[0]?.message ?? fallback;
};
