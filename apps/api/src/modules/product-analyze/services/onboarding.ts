import type {
  Allergy,
  DietType,
  UserProfile,
  NutritionPriority,
  Restriction,
} from '@prisma/client';
import type { OnboardingRequest, OnboardingResponse } from '@acme/shared';
import { DEFAULT_ONBOARDING_RESPONSE } from '@acme/shared';
import { prisma } from '../lib/prisma';
import {
  hasAnalysisRelevantOnboardingChanges,
  touchUserAnalysisPreferencesUpdatedAt,
} from './analysis-cache';

const LEGACY_DIET_RESTRICTION_MAP: Partial<Record<DietType, Restriction>> = {
  KETO: 'KETO',
  VEGAN: 'VEGAN',
  VEGETARIAN: 'VEGETARIAN',
  PALEO: 'PALEO',
  GLUTEN_FREE: 'GLUTEN_FREE',
  DAIRY_FREE: 'DAIRY_FREE',
};

const LEGACY_DIET_PRIORITY_MAP: Partial<Record<DietType, NutritionPriority>> = {
  LOW_CARB: 'LOW_CARB',
};

const getUniqueValues = <T extends string>(values: T[]): T[] => Array.from(new Set(values));

const getMergedRestrictions = (profile: UserProfile): Restriction[] => {
  const restrictions = [...profile.restrictions];
  const mappedRestriction = profile.legacyDietType
    ? LEGACY_DIET_RESTRICTION_MAP[profile.legacyDietType]
    : undefined;

  return mappedRestriction ? getUniqueValues([...restrictions, mappedRestriction]) : restrictions;
};

const getMergedNutritionPriorities = (profile: UserProfile): NutritionPriority[] => {
  const priorities = [...profile.nutritionPriorities];
  const mappedPriority = profile.legacyDietType
    ? LEGACY_DIET_PRIORITY_MAP[profile.legacyDietType]
    : undefined;

  return mappedPriority ? getUniqueValues([...priorities, mappedPriority]) : priorities;
};

const toOnboardingResponse = (profile: UserProfile): OnboardingResponse => ({
  mainGoal: profile.mainGoal,
  restrictions: getMergedRestrictions(profile),
  allergies: profile.allergies,
  otherAllergiesText: profile.otherAllergiesText,
  nutritionPriorities: getMergedNutritionPriorities(profile),
  legacyDietType: profile.legacyDietType,
  onboardingCompleted: profile.onboardingCompleted,
});

const toComparableOnboarding = (profile: UserProfile | null): OnboardingResponse =>
  profile ? toOnboardingResponse(profile) : DEFAULT_ONBOARDING_RESPONSE;

export const getUserOnboarding = async (userId: string): Promise<OnboardingResponse> => {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return DEFAULT_ONBOARDING_RESPONSE;
  }

  return toOnboardingResponse(profile);
};

export const upsertUserOnboarding = async (
  userId: string,
  data: OnboardingRequest,
): Promise<OnboardingResponse> => {
  const existingProfile = await prisma.userProfile.findUnique({ where: { userId } });
  const restrictions = getUniqueValues(data.restrictions);
  const allergies = getUniqueValues(data.allergies as Allergy[]);
  const nutritionPriorities = getUniqueValues(data.nutritionPriorities);
  const shouldInvalidateCache = hasAnalysisRelevantOnboardingChanges(
    toComparableOnboarding(existingProfile),
    {
      ...data,
      restrictions,
      allergies,
      nutritionPriorities,
      otherAllergiesText: data.otherAllergiesText ?? null,
    },
  );

  const profile = await prisma.$transaction(async (tx) => {
    const savedProfile = await tx.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        legacyDietType: null,
        mainGoal: data.mainGoal,
        restrictions,
        allergies,
        otherAllergiesText: data.otherAllergiesText,
        nutritionPriorities,
        onboardingCompleted: true,
      },
      update: {
        legacyDietType: null,
        mainGoal: data.mainGoal,
        restrictions,
        allergies,
        otherAllergiesText: data.otherAllergiesText,
        nutritionPriorities,
        onboardingCompleted: true,
      },
    });

    if (shouldInvalidateCache) {
      await touchUserAnalysisPreferencesUpdatedAt(userId, tx);
    }

    return savedProfile;
  });

  return toOnboardingResponse(profile);
};
