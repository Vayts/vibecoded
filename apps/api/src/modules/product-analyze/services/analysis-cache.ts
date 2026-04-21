import type { OnboardingRequest, OnboardingResponse, UpdateFamilyMemberRequest } from '@acme/shared';
import { DEFAULT_ONBOARDING_RESPONSE } from '@acme/shared';
import type { FamilyMember } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const ANALYSIS_CACHE_WINDOW_MS = 4 * 60 * 60 * 1000;

type UserDelegateContext = Pick<typeof prisma, 'user'>;

type ComparableOnboarding = Pick<
  OnboardingResponse,
  'mainGoal' | 'restrictions' | 'allergies' | 'otherAllergiesText' | 'nutritionPriorities'
>;

const getSortedUniqueValues = <T extends string>(values: T[]): T[] =>
  [...new Set(values)].sort((left, right) => left.localeCompare(right));

const areStringArraysEqual = <T extends string>(left: T[], right: T[]): boolean => {
  const normalizedLeft = getSortedUniqueValues(left);
  const normalizedRight = getSortedUniqueValues(right);

  return normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index]);
};

export const hasAnalysisRelevantOnboardingChanges = (
  current: ComparableOnboarding = DEFAULT_ONBOARDING_RESPONSE,
  next: OnboardingRequest,
): boolean => {
  if (current.mainGoal !== next.mainGoal) {
    return true;
  }

  if (current.otherAllergiesText !== next.otherAllergiesText) {
    return true;
  }

  if (!areStringArraysEqual(current.restrictions, next.restrictions)) {
    return true;
  }

  if (!areStringArraysEqual(current.allergies, next.allergies)) {
    return true;
  }

  return !areStringArraysEqual(current.nutritionPriorities, next.nutritionPriorities);
};

export const hasAnalysisRelevantFamilyMemberChanges = (
  current: FamilyMember,
  next: UpdateFamilyMemberRequest,
): boolean => {
  if (next.mainGoal !== undefined && next.mainGoal !== current.mainGoal) {
    return true;
  }

  if (next.otherAllergiesText !== undefined && next.otherAllergiesText !== current.otherAllergiesText) {
    return true;
  }

  if (next.restrictions !== undefined && !areStringArraysEqual(current.restrictions, next.restrictions)) {
    return true;
  }

  if (next.allergies !== undefined && !areStringArraysEqual(current.allergies, next.allergies)) {
    return true;
  }

  return next.nutritionPriorities !== undefined &&
    !areStringArraysEqual(current.nutritionPriorities, next.nutritionPriorities);
};

export const getAnalysisCacheBoundary = (
  analysisPreferencesUpdatedAt: Date | null | undefined,
  now = new Date(),
): Date => {
  const windowBoundary = now.getTime() - ANALYSIS_CACHE_WINDOW_MS;
  const preferenceBoundary = analysisPreferencesUpdatedAt?.getTime() ?? 0;

  return new Date(Math.max(windowBoundary, preferenceBoundary));
};

export const getAnalysisCacheBoundaryForUser = async (
  userId: string,
  db: UserDelegateContext = prisma,
  now = new Date(),
): Promise<Date> => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { analysisPreferencesUpdatedAt: true },
  });

  return getAnalysisCacheBoundary(user?.analysisPreferencesUpdatedAt, now);
};

export const touchUserAnalysisPreferencesUpdatedAt = async (
  userId: string,
  db: UserDelegateContext = prisma,
  touchedAt = new Date(),
) => {
  await db.user.update({
    where: { id: userId },
    data: { analysisPreferencesUpdatedAt: touchedAt },
  });
};

