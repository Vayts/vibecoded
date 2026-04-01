import { z } from 'zod';

export const MAIN_GOAL_VALUES = [
  'GENERAL_HEALTH',
  'WEIGHT_LOSS',
  'DIABETES_CONTROL',
  'PREGNANCY',
  'MUSCLE_GAIN',
] as const;

export const RESTRICTION_VALUES = [
  'VEGAN',
  'VEGETARIAN',
  'KETO',
  'PALEO',
  'GLUTEN_FREE',
  'DAIRY_FREE',
  'HALAL',
  'KOSHER',
  'NUT_FREE',
] as const;

export const LEGACY_DIET_TYPE_VALUES = [
  'NONE',
  'KETO',
  'VEGAN',
  'VEGETARIAN',
  'PALEO',
  'LOW_CARB',
  'GLUTEN_FREE',
  'DAIRY_FREE',
] as const;

export const ALLERGY_VALUES = [
  'PEANUTS',
  'TREE_NUTS',
  'GLUTEN',
  'DAIRY',
  'SOY',
  'EGGS',
  'SHELLFISH',
  'SESAME',
  'OTHER',
] as const;

export const NUTRITION_PRIORITY_VALUES = [
  'HIGH_PROTEIN',
  'LOW_SUGAR',
  'LOW_SODIUM',
  'LOW_CARB',
  'HIGH_FIBER',
] as const;

export const mainGoalSchema = z.enum(MAIN_GOAL_VALUES);
export const restrictionSchema = z.enum(RESTRICTION_VALUES);
export const legacyDietTypeSchema = z.enum(LEGACY_DIET_TYPE_VALUES);
export const allergySchema = z.enum(ALLERGY_VALUES);
export const nutritionPrioritySchema = z.enum(NUTRITION_PRIORITY_VALUES);

const nullableMainGoalSchema = z.union([mainGoalSchema, z.null()]);
const nullableLegacyDietTypeSchema = z.union([legacyDietTypeSchema, z.null()]);

const nullableOtherAllergiesTextSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => (typeof value === 'string' ? value.trim() : null))
  .refine((value) => value === null || value.length <= 120, {
    message: 'otherAllergiesText must be 120 characters or fewer',
  });

export const onboardingRequestSchema = z
  .object({
    mainGoal: mainGoalSchema,
    restrictions: z.array(restrictionSchema),
    allergies: z.array(allergySchema),
    otherAllergiesText: nullableOtherAllergiesTextSchema,
    nutritionPriorities: z.array(nutritionPrioritySchema),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.allergies.includes('OTHER') && value.otherAllergiesText !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['otherAllergiesText'],
        message: 'otherAllergiesText is only allowed when allergies includes OTHER',
      });
    }
  });

export type OnboardingRequest = z.infer<typeof onboardingRequestSchema>;

export const onboardingResponseSchema = z
  .object({
    mainGoal: nullableMainGoalSchema,
    restrictions: z.array(restrictionSchema),
    allergies: z.array(allergySchema),
    otherAllergiesText: z.string().nullable(),
    nutritionPriorities: z.array(nutritionPrioritySchema),
    legacyDietType: nullableLegacyDietTypeSchema,
    onboardingCompleted: z.boolean(),
  })
  .strict();

export type OnboardingResponse = z.infer<typeof onboardingResponseSchema>;

export const DEFAULT_ONBOARDING_RESPONSE: OnboardingResponse = {
  mainGoal: null,
  restrictions: [],
  allergies: [],
  otherAllergiesText: null,
  nutritionPriorities: [],
  legacyDietType: null,
  onboardingCompleted: false,
};
