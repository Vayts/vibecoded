export const TRACE_SENSITIVE_RESTRICTIONS = ['GLUTEN_FREE', 'DAIRY_FREE', 'NUT_FREE'] as const;

const TRACE_SENSITIVE_RESTRICTION_SET = new Set<string>(TRACE_SENSITIVE_RESTRICTIONS);

export function isTraceSensitiveRestriction(
  restriction: string | null | undefined,
): restriction is (typeof TRACE_SENSITIVE_RESTRICTIONS)[number] {
  return Boolean(restriction && TRACE_SENSITIVE_RESTRICTION_SET.has(restriction));
}

export function normalizeTraceRestriction(restriction: string | null | undefined): string | null {
  return isTraceSensitiveRestriction(restriction) ? restriction : null;
}

export function getTraceSensitiveConcerns(
  allergies: readonly string[],
  restrictions: readonly string[],
): string[] {
  return [...allergies, ...restrictions.filter(isTraceSensitiveRestriction)];
}
