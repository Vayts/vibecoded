import { normalizeTraceRestriction } from '../../../utils/trace-sensitive-restrictions.util.js';
import { VALID_ALLERGY_SET, VALID_RESTRICTION_SET } from './ai-contracts.js';
import type { AiTraceDetectionOutput } from './ai-contracts.js';
import { buildAllergyDedupeKey, normalizeCustomAllergyValue } from './ai-allergy-normalization.js';
import { textContainsGroundedValue } from './ai-text-normalization.js';

const NEGATIVE_EVIDENCE_PATTERN =
  /\b(?:no|none|without|absent|missing|unlisted)\b|\bnot\s+(?:listed|found|present|detected|triggered|directly\s+triggered)\b|\bdoes\s+not\s+(?:contain|list|show|include|appear|match)\b|\b(?:isn't|is\s+not)\s+(?:listed|present|included|detected|triggered)\b|\bfree\s+from\b/iu;

export const removeDuplicateTraceAllergy = (
  detection: AiTraceDetectionOutput,
  directAllergyKeys: Set<string>,
): AiTraceDetectionOutput | null => {
  const allergyKey = buildAllergyDedupeKey(detection.allergy, detection.customAllergy);

  if (!allergyKey || !directAllergyKeys.has(allergyKey)) return detection;

  if (detection.restriction) {
    return { ...detection, allergy: null, customAllergy: null };
  }

  return null;
};

export const normalizeTraceDetection = (
  detection: AiTraceDetectionOutput,
  groundingValues: string[],
): AiTraceDetectionOutput | null => {
  const evidence = Array.isArray(detection.evidence) ? detection.evidence : [];
  const evidenceText = evidence.join(' ');
  const trace = detection.trace.trim();

  if (!trace || NEGATIVE_EVIDENCE_PATTERN.test(evidenceText)) return null;

  const hasGroundedEvidence =
    groundingValues.length > 0 &&
    (textContainsGroundedValue(trace, groundingValues) ||
      evidence.some((item) => textContainsGroundedValue(item, groundingValues)));

  if (!hasGroundedEvidence) return null;

  const allergy =
    detection.allergy && VALID_ALLERGY_SET.has(detection.allergy) ? detection.allergy : null;
  const restriction =
    detection.restriction && VALID_RESTRICTION_SET.has(detection.restriction)
      ? normalizeTraceRestriction(detection.restriction)
      : null;

  return {
    trace,
    allergy,
    customAllergy:
      allergy === 'OTHER' ? normalizeCustomAllergyValue(detection.customAllergy) : null,
    restriction,
    source: detection.source,
    confidence: detection.confidence,
    evidence,
  };
};
