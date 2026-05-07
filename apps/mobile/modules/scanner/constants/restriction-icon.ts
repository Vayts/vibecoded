import {
  Vegan,
  Beef,
  Hamburger,
  BowArrow,
  WheatOff,
  MilkOff,
  PiggyBank,
  NutOff,
  OctagonMinus,
  type LucideIcon,
} from 'lucide-react-native';

export const RESTRICTION_ICON = {
  VEGAN: Vegan,
  VEGETARIAN: Beef,
  KETO: Hamburger,
  PALEO: BowArrow,
  GLUTEN_FREE: WheatOff,
  DAIRY_FREE: MilkOff,
  PORK_FREE: PiggyBank,
  NUT_FREE: NutOff,
  default: OctagonMinus,
} satisfies Record<string, LucideIcon>;

const SAFETY_ICON_ALIASES = {
  vegan: 'VEGAN',
  vegetarian: 'VEGETARIAN',
  keto: 'KETO',
  paleo: 'PALEO',
  gluten: 'GLUTEN_FREE',
  glutenfree: 'GLUTEN_FREE',
  wheat: 'GLUTEN_FREE',
  dairy: 'DAIRY_FREE',
  milk: 'DAIRY_FREE',
  lactose: 'DAIRY_FREE',
  pork: 'PORK_FREE',
  porkfree: 'PORK_FREE',
  nut: 'NUT_FREE',
  nuts: 'NUT_FREE',
  peanut: 'NUT_FREE',
  peanuts: 'NUT_FREE',
  treenut: 'NUT_FREE',
  treenuts: 'NUT_FREE',
} as const;

const normalizeSafetyIconKey = (value: string): string =>
  value.toLowerCase().replace(/[^a-z]/g, '');

export const getSafetyIcon = (value: string): LucideIcon => {
  const iconKey = SAFETY_ICON_ALIASES[normalizeSafetyIconKey(value) as keyof typeof SAFETY_ICON_ALIASES];

  return iconKey ? RESTRICTION_ICON[iconKey] : RESTRICTION_ICON.default;
};
