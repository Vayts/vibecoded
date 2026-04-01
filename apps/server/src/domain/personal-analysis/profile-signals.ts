import type {
  BarcodeLookupProduct,
  NegativeProductAnalysisItem,
  OnboardingResponse,
  PositiveProductAnalysisItem,
} from '@acme/shared';

interface PersonalSignalDeps {
  createPositive: (
    key: string,
    label: string,
    description: string,
    value: number | null,
    unit: string | null,
    overview: string,
  ) => PositiveProductAnalysisItem;
  createNegative: (
    key: string,
    label: string,
    description: string,
    value: number | null,
    unit: string | null,
    overview: string,
    severity?: NegativeProductAnalysisItem['severity'],
  ) => NegativeProductAnalysisItem;
}

export const applyGoalAndPrioritySignals = (
  product: BarcodeLookupProduct,
  onboarding: OnboardingResponse,
  positives: Map<string, PositiveProductAnalysisItem>,
  negatives: Map<string, NegativeProductAnalysisItem>,
  personalizedPositiveKeys: Set<string>,
  personalizedNegativeKeys: Set<string>,
  deps: PersonalSignalDeps,
): number => {
  let adjustment = 0;
  const sugar = product.nutrition.sugars_100g;
  const salt = product.nutrition.salt_100g;
  const protein = product.nutrition.proteins_100g;
  const fiber = product.nutrition.fiber_100g;
  const calories = product.nutrition.energy_kcal_100g;
  const needsLowSugar =
    onboarding.nutritionPriorities.includes('LOW_SUGAR') ||
    onboarding.mainGoal === 'DIABETES_CONTROL';
  const needsLowSodium = onboarding.nutritionPriorities.includes('LOW_SODIUM');
  const needsHighProtein =
    onboarding.nutritionPriorities.includes('HIGH_PROTEIN') ||
    onboarding.mainGoal === 'MUSCLE_GAIN';
  const needsHighFiber = onboarding.nutritionPriorities.includes('HIGH_FIBER');
  const weightLossFocused = onboarding.mainGoal === 'WEIGHT_LOSS';

  if (needsLowSugar && sugar != null) {
    if (sugar <= 5) {
      adjustment += 10;
      positives.set(
        'sugar',
        deps.createPositive(
          'sugar',
          'Sugar',
          'Fits your low sugar preference',
          sugar,
          'g',
          'This sugar level fits your profile well.',
        ),
      );
      personalizedPositiveKeys.add('sugar');
    } else if (sugar > 10) {
      adjustment -= 16;
      negatives.set(
        'sugar',
        deps.createNegative(
          'sugar',
          'Sugar',
          'Too high for your low sugar preference',
          sugar,
          'g',
          'This sugar level is higher than ideal for your profile.',
          sugar > 20 ? 'bad' : 'warning',
        ),
      );
      personalizedNegativeKeys.add('sugar');
    }
  }

  if (needsLowSodium && salt != null) {
    if (salt <= 0.5) {
      adjustment += 10;
      positives.set(
        'salt',
        deps.createPositive(
          'salt',
          'Salt',
          'Fits your low sodium preference',
          salt,
          'g',
          'This salt level is in a comfortable range for your profile.',
        ),
      );
      personalizedPositiveKeys.add('salt');
    } else if (salt > 1) {
      adjustment -= 16;
      negatives.set(
        'salt',
        deps.createNegative(
          'salt',
          'Salt',
          'Too salty for your profile',
          salt,
          'g',
          'This salt level is higher than ideal for your profile.',
          salt > 1.5 ? 'bad' : 'warning',
        ),
      );
      personalizedNegativeKeys.add('salt');
    }
  }

  if (needsHighProtein && protein != null) {
    if (protein >= 8) {
      adjustment += 10;
      positives.set(
        'protein',
        deps.createPositive(
          'protein',
          'Protein',
          'Supports your protein goal',
          protein,
          'g',
          'This protein level is a good fit for your profile.',
        ),
      );
      personalizedPositiveKeys.add('protein');
    } else if (protein < 5) {
      adjustment -= 8;
      negatives.set(
        'protein',
        deps.createNegative(
          'protein',
          'Protein',
          'Lower than your protein target',
          protein,
          'g',
          'This product is lighter on protein than your profile suggests.',
        ),
      );
      personalizedNegativeKeys.add('protein');
    }
  }

  if (needsHighFiber && fiber != null) {
    if (fiber >= 3) {
      adjustment += 8;
      positives.set(
        'fiber',
        deps.createPositive(
          'fiber',
          'Fiber',
          'Fits your high fiber preference',
          fiber,
          'g',
          'This fiber level aligns well with your profile.',
        ),
      );
      personalizedPositiveKeys.add('fiber');
    } else if (fiber < 2) {
      adjustment -= 6;
      negatives.set(
        'fiber',
        deps.createNegative(
          'fiber',
          'Fiber',
          'Lower fiber than preferred',
          fiber,
          'g',
          'This product has less fiber than your profile suggests.',
        ),
      );
      personalizedNegativeKeys.add('fiber');
    }
  }

  if (weightLossFocused && calories != null && calories > 300) {
    adjustment -= 8;
    negatives.set(
      'calories',
      deps.createNegative(
        'calories',
        'Calories',
        'Calorie-dense for your goal',
        calories,
        'kcal',
        'This calorie density is less aligned with your current goal.',
      ),
    );
    personalizedNegativeKeys.add('calories');
  }

  return adjustment;
};
