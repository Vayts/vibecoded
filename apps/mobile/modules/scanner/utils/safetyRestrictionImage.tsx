import type { ImageSourcePropType } from 'react-native';

import dairyImage from '../../../assets/images/dairy.png';
import defaultRestrictionImage from '../../../assets/images/default-restriction.png';
import eggsImage from '../../../assets/images/eggs.png';
import glutenImage from '../../../assets/images/gluten.png';
import peanutsImage from '../../../assets/images/peanuts.png';
import sesameImage from '../../../assets/images/sesame.png';
import shellfishImage from '../../../assets/images/shellfish.png';
import soyImage from '../../../assets/images/soy.png';
import treeNutsImage from '../../../assets/images/treenust.png';
import paleoImage from '../../../assets/images/paleo.png';
import porkImage from '../../../assets/images/pork.png';

import MascotDairy from '../../../assets/icons/mascot/restrictions/dairy.svg';
import MascotEggs from '../../../assets/icons/mascot/restrictions/eggs.svg';
import MascotGluten from '../../../assets/icons/mascot/restrictions/gluten.svg';
import MascotPeanuts from '../../../assets/icons/mascot/restrictions/peanuts.svg';
import MascotSesame from '../../../assets/icons/mascot/restrictions/sesame.svg';
import MascotShellfish from '../../../assets/icons/mascot/restrictions/shellfish.svg';
import MascotSoy from '../../../assets/icons/mascot/restrictions/soy.svg';
import MascotTreeNuts from '../../../assets/icons/mascot/restrictions/tree.svg';
import MascotPork from '../../../assets/icons/mascot/restrictions/pork.svg';
import MascotDefault from '../../../assets/icons/mascot/restrictions/default.svg';
import MascotWarning from '../../../assets/icons/mascot/restrictions/warning.svg';
import MascotVegan from '../../../assets/icons/mascot/restrictions/vegan.svg';
import MascotVegetarian from '../../../assets/icons/mascot/restrictions/vegeterian.svg';
import PaleoMascot from '../../../assets/icons/mascot/restrictions/paleo.svg';
import NutsMascot from '../../../assets/icons/mascot/restrictions/nuts.svg';
import KetoMascot from '../../../assets/icons/mascot/restrictions/keto.svg';
import MascotGood from '../../../assets/icons/mascot/restrictions/good.svg';
import { SvgProps } from 'react-native-svg';
import { FC } from 'react';

interface SafetyRestrictionImageInfo {
  violatedRestrictions: string[];
  matchedAllergens: string[];
  traceRestrictions: string[];
  traceAllergens: string[];
}

const RESTRICTION_IMAGES = {
  dairy: dairyImage,
  eggs: eggsImage,
  gluten: glutenImage,
  peanuts: peanutsImage,
  sesame: sesameImage,
  shellfish: shellfishImage,
  soy: soyImage,
  treeNuts: treeNutsImage,
  default: defaultRestrictionImage,
  paleo: paleoImage,
  pork: porkImage,
} satisfies Record<string, ImageSourcePropType>;

const CAN_I_IMAGES: Record<string, FC<SvgProps>> = {
  dairy: MascotDairy,
  eggs: MascotEggs,
  gluten: MascotGluten,
  peanuts: MascotPeanuts,
  sesame: MascotSesame,
  shellfish: MascotShellfish,
  soy: MascotSoy,
  treeNuts: MascotTreeNuts,
  default: MascotDefault,
  pork: MascotPork,
  warning: MascotWarning,
  good: MascotGood,
  vegan: MascotVegan,
  vegetarian: MascotVegetarian,
  paleo: PaleoMascot,
  nuts: NutsMascot,
  keto: KetoMascot,
};

const CAN_I_IMAGES_ALIASES: Record<string, FC<SvgProps>> = {
  DAIRY_FREE: CAN_I_IMAGES.dairy,
  DAIRY: CAN_I_IMAGES.dairy,
  EGGS: CAN_I_IMAGES.eggs,
  GLUTEN_FREE: CAN_I_IMAGES.gluten,
  GLUTEN: CAN_I_IMAGES.gluten,
  NUT_FREE: CAN_I_IMAGES.nuts,
  PEANUTS: CAN_I_IMAGES.peanuts,
  SESAME: CAN_I_IMAGES.sesame,
  SHELLFISH: CAN_I_IMAGES.shellfish,
  SOY: CAN_I_IMAGES.soy,
  TREE_NUTS: CAN_I_IMAGES.treeNuts,
  PALEO: CAN_I_IMAGES.paleo,
  PORK_FREE: CAN_I_IMAGES.pork,
  VEGAN: CAN_I_IMAGES.pork,
  KETO: CAN_I_IMAGES.keto,
  VEGETARIAN: CAN_I_IMAGES.vegetarian,
  warning: CAN_I_IMAGES.warning,
  default: CAN_I_IMAGES.default,
  good: CAN_I_IMAGES.good,
};

const IMAGE_ALIASES: Record<string, ImageSourcePropType> = {
  DAIRY_FREE: RESTRICTION_IMAGES.dairy,
  DAIRY: RESTRICTION_IMAGES.dairy,
  EGGS: RESTRICTION_IMAGES.eggs,
  GLUTEN_FREE: RESTRICTION_IMAGES.gluten,
  GLUTEN: RESTRICTION_IMAGES.gluten,
  NUT_FREE: RESTRICTION_IMAGES.treeNuts,
  PEANUTS: RESTRICTION_IMAGES.peanuts,
  SESAME: RESTRICTION_IMAGES.sesame,
  SHELLFISH: RESTRICTION_IMAGES.shellfish,
  SOY: RESTRICTION_IMAGES.soy,
  TREE_NUTS: RESTRICTION_IMAGES.treeNuts,
  PALEO: RESTRICTION_IMAGES.paleo,
  PORK_FREE: RESTRICTION_IMAGES.pork,
  VEGAN: RESTRICTION_IMAGES.pork,
  VEGETARIAN: RESTRICTION_IMAGES.pork,
};

const getFirstPrioritySafetyValue = (safetyInfo: SafetyRestrictionImageInfo): string | null => {
  const priorityGroups = [
    safetyInfo.violatedRestrictions,
    safetyInfo.matchedAllergens,
    safetyInfo.traceRestrictions,
    safetyInfo.traceAllergens,
  ];

  for (const group of priorityGroups) {
    const value = group.find((item) => item.trim().length > 0);

    if (value) {
      return value;
    }
  }

  return null;
};

export const getSafetyRestrictionImage = (
  safetyInfo: SafetyRestrictionImageInfo,
): ImageSourcePropType => {
  const safetyValue = getFirstPrioritySafetyValue(safetyInfo);

  if (!safetyValue) {
    return RESTRICTION_IMAGES.default;
  }

  return IMAGE_ALIASES[safetyValue.trim()] ?? RESTRICTION_IMAGES.default;
};

export const getCanIRestrictionImage = (
  safetyInfo: SafetyRestrictionImageInfo,
  status?: 'yes' | 'no' | 'warning',
): FC<SvgProps> => {
  const safetyValue = getFirstPrioritySafetyValue(safetyInfo);
  const priorityGroups = [
    ...safetyInfo.violatedRestrictions,
    ...safetyInfo.matchedAllergens,
    ...safetyInfo.traceRestrictions,
    ...safetyInfo.traceAllergens,
  ];

  if (status === 'warning') return CAN_I_IMAGES_ALIASES.warning;

  if (priorityGroups.length === 0) {
    return CAN_I_IMAGES_ALIASES.good;
  }

  if (!safetyValue) {
    return CAN_I_IMAGES_ALIASES.default;
  }

  return CAN_I_IMAGES_ALIASES[safetyValue.trim()] ?? CAN_I_IMAGES.default;
};
