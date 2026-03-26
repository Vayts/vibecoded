import { createHash } from 'node:crypto';
import type { IngredientAnalysisResult, OnboardingResponse } from '@acme/shared';
import { ingredientAnalysisResultSchema } from './ingredientAnalysisSchema';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * Deterministic hash of the user's dietary profile.
 * Two users with identical restrictions/allergies/priorities/goal get the same hash,
 * which means they share cached ingredient analysis results for the same product.
 */
export const computeProfileHash = (onboarding: OnboardingResponse): string => {
  const data = JSON.stringify({
    r: [...onboarding.restrictions].sort(),
    a: [...onboarding.allergies].sort(),
    p: [...onboarding.nutritionPriorities].sort(),
    g: onboarding.mainGoal,
  });
  return createHash('sha256').update(data).digest('hex').slice(0, 16);
};

export const findCachedIngredientAnalysis = async (
  barcode: string,
  profileHash: string,
): Promise<IngredientAnalysisResult | null> => {
  const row = await prisma.productIngredientCache.findUnique({
    where: { barcode_profileHash: { barcode, profileHash } },
  });
  if (!row) return null;

  const parsed = ingredientAnalysisResultSchema.safeParse(row.result);
  return parsed.success ? parsed.data : null;
};

export const upsertCachedIngredientAnalysis = async (
  barcode: string,
  profileHash: string,
  result: IngredientAnalysisResult,
): Promise<void> => {
  const data = result as unknown as Prisma.InputJsonValue;
  await prisma.productIngredientCache.upsert({
    where: { barcode_profileHash: { barcode, profileHash } },
    create: { barcode, profileHash, result: data },
    update: { result: data, updatedAt: new Date() },
  });
};
