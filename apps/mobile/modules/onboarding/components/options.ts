import type { Allergy, MainGoal, NutritionPriority, Restriction } from '../stores/onboarding/types';

export const MAIN_GOAL_OPTIONS: Array<{ value: MainGoal; label: string; description: string }> = [
  {
    value: 'GENERAL_HEALTH',
    label: 'General health',
    description: 'Keep recommendations balanced and sustainable.',
  },
  {
    value: 'WEIGHT_LOSS',
    label: 'Weight loss',
    description: 'Bias toward lighter, calorie-aware choices.',
  },
  {
    value: 'DIABETES_CONTROL',
    label: 'Diabetes control',
    description: 'Favor steadier blood-sugar-friendly options.',
  },
  {
    value: 'PREGNANCY',
    label: 'Pregnancy',
    description: 'Focus on pregnancy-appropriate nutrition guidance.',
  },
  {
    value: 'MUSCLE_GAIN',
    label: 'Muscle gain',
    description: 'Lean toward recovery and muscle-supporting meals.',
  },
];

export const RESTRICTION_OPTIONS: Array<{
  value: Restriction;
  label: string;
  description: string;
}> = [
  { value: 'VEGAN', label: 'Vegan', description: 'Never include animal-derived ingredients.' },
  { value: 'VEGETARIAN', label: 'Vegetarian', description: 'Never include meat or fish.' },
  {
    value: 'KETO',
    label: 'Keto',
    description: 'Keep recommendations aligned with a ketogenic diet.',
  },
  { value: 'PALEO', label: 'Paleo', description: 'Stay within paleo-style ingredient rules.' },
  { value: 'GLUTEN_FREE', label: 'Gluten-free', description: 'Exclude wheat, barley, and rye.' },
  {
    value: 'DAIRY_FREE',
    label: 'Dairy-free',
    description: 'Exclude milk-based ingredients and products.',
  },
  { value: 'HALAL', label: 'Halal', description: 'Only return halal-compliant options.' },
  { value: 'KOSHER', label: 'Kosher', description: 'Only return kosher-compliant options.' },
  {
    value: 'NUT_FREE',
    label: 'Nut-free',
    description: 'Exclude peanuts and tree nuts as a hard constraint.',
  },
];

export const ALLERGY_OPTIONS: Array<{ value: Allergy; label: string }> = [
  { value: 'PEANUTS', label: 'Peanuts' },
  { value: 'TREE_NUTS', label: 'Tree nuts' },
  { value: 'GLUTEN', label: 'Gluten' },
  { value: 'DAIRY', label: 'Lactose / dairy' },
  { value: 'SOY', label: 'Soy' },
  { value: 'EGGS', label: 'Eggs' },
  { value: 'SHELLFISH', label: 'Shellfish' },
  { value: 'SESAME', label: 'Sesame' },
  { value: 'OTHER', label: 'Other' },
];

export const NUTRITION_PRIORITY_OPTIONS: Array<{
  value: NutritionPriority;
  label: string;
  description: string;
}> = [
  { value: 'HIGH_PROTEIN', label: 'High protein', description: 'Prioritize protein-rich meals.' },
  { value: 'LOW_SUGAR', label: 'Low sugar', description: 'Reduce added sugar and sweet snacks.' },
  {
    value: 'LOW_SODIUM',
    label: 'Low sodium',
    description: 'Keep salt and packaged foods lighter.',
  },
  { value: 'LOW_CARB', label: 'Low carb', description: 'Stay more intentional with carb intake.' },
  {
    value: 'HIGH_FIBER',
    label: 'More fiber',
    description: 'Lean into vegetables, legumes, and grains.',
  },
];

export const MAIN_GOAL_LABELS: Record<MainGoal, string> = Object.fromEntries(
  MAIN_GOAL_OPTIONS.map((option) => [option.value, option.label]),
) as Record<MainGoal, string>;

export const RESTRICTION_LABELS: Record<Restriction, string> = Object.fromEntries(
  RESTRICTION_OPTIONS.map((option) => [option.value, option.label]),
) as Record<Restriction, string>;

export const ALLERGY_LABELS: Record<Allergy, string> = Object.fromEntries(
  ALLERGY_OPTIONS.map((option) => [option.value, option.label]),
) as Record<Allergy, string>;

export const NUTRITION_PRIORITY_LABELS: Record<NutritionPriority, string> = Object.fromEntries(
  NUTRITION_PRIORITY_OPTIONS.map((option) => [option.value, option.label]),
) as Record<NutritionPriority, string>;
