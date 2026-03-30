/**
 * Deterministic post-processing filter that strips invalid dietary restriction violations.
 *
 * Universal principle: an ingredient violates a diet ONLY if it is GUARANTEED to conflict.
 * If the AI flags a diet violation but the text doesn't mention a DEFINITELY banned item,
 * the violation is removed. This catches ambiguous ingredients (gelatin, natural flavors,
 * mono/diglycerides, enzymes, etc.) that the AI over-flags.
 */

// Per-diet BANNED keyword lists — only these can trigger a valid violation.
const DIET_BANNED: Record<string, string[]> = {
  HALAL: ['pork', 'bacon', 'ham', 'lard', 'prosciutto', 'pancetta', 'alcohol', 'wine', 'beer', 'spirit', 'rum', 'vodka', 'whiskey', 'brandy', 'liquor'],
  KOSHER: ['pork', 'bacon', 'ham', 'lard', 'shellfish', 'shrimp', 'crab', 'lobster', 'squid', 'octopus'],
  VEGAN: ['meat', 'beef', 'chicken', 'turkey', 'lamb', 'pork', 'bacon', 'ham', 'fish', 'salmon', 'tuna', 'shellfish', 'shrimp', 'dairy', 'milk', 'cream', 'butter', 'cheese', 'whey', 'casein', 'egg', 'honey', 'gelatin', 'lard', 'collagen', 'carmine', 'shellac'],
  VEGETARIAN: ['meat', 'beef', 'chicken', 'turkey', 'lamb', 'pork', 'bacon', 'ham', 'fish', 'salmon', 'tuna', 'shellfish', 'shrimp', 'gelatin', 'lard', 'collagen', 'carmine'],
  GLUTEN_FREE: ['wheat', 'barley', 'rye', 'spelt', 'semolina', 'bulgur', 'malt', 'seitan', 'farro', 'durum', 'gluten'],
  DAIRY_FREE: ['milk', 'cream', 'butter', 'ghee', 'cheese', 'yogurt', 'kefir', 'whey', 'casein', 'lactose'],
  NUT_FREE: ['peanut', 'almond', 'walnut', 'cashew', 'hazelnut', 'pistachio', 'macadamia', 'pecan', 'brazil nut', 'pine nut', 'nut butter', 'nut oil', 'nut flour', 'praline', 'marzipan', 'nougat', 'gianduja', 'tree nut'],
  KETO: ['bread', 'pasta', 'rice', 'cereal', 'potato', 'corn', 'legume', 'sugar', 'syrup', 'candy', 'juice', 'soda'],
  PALEO: ['grain', 'legume', 'dairy', 'refined sugar'],
};

// Keywords that identify which diet is being referenced in a text
const DIET_KEYWORDS: Record<string, string[]> = {
  HALAL: ['halal'],
  KOSHER: ['kosher'],
  VEGAN: ['vegan'],
  VEGETARIAN: ['vegetarian'],
  GLUTEN_FREE: ['gluten-free', 'gluten free', 'celiac'],
  DAIRY_FREE: ['dairy-free', 'dairy free', 'lactose-free', 'lactose free'],
  NUT_FREE: ['nut-free', 'nut free'],
  KETO: ['keto'],
  PALEO: ['paleo'],
};

/**
 * Check if text mentions a specific diet and whether it also mentions
 * a DEFINITELY banned ingredient for that diet.
 * Returns true (= false positive) if the diet is mentioned but no banned item is found.
 */
export function isFalseDietViolation(text: string): boolean {
  const lower = text.toLowerCase();

  for (const [diet, keywords] of Object.entries(DIET_KEYWORDS)) {
    if (!keywords.some((kw) => lower.includes(kw))) continue;

    // This text references this diet — check if any BANNED keyword is present
    const banned = DIET_BANNED[diet];
    if (!banned) continue;

    const hasBannedItem = banned.some((kw) => lower.includes(kw));
    if (!hasBannedItem) {
      // Diet mentioned but no definitely-banned ingredient → false positive
      return true;
    }
  }

  return false;
}

/**
 * Filter an array of bullet-point strings, removing false dietary violations.
 */
export function filterComparisonBullets(negatives: string[]): string[] {
  return negatives.filter((text) => {
    if (isFalseDietViolation(text)) {
      console.log(`[filter] ❌ REMOVED false diet violation: "${text}"`);
      return false;
    }
    return true;
  });
}

/**
 * Filter structured personal analysis items (negatives array with key/description).
 * Used for the personal analysis flow (not comparison).
 */
export function filterPersonalAnalysisNegatives<
  T extends { key: string; description: string; category: string },
>(negatives: T[]): T[] {
  return negatives.filter((item) => {
    if (item.category !== 'restriction') return true;

    const combinedText = `${item.key} ${item.description}`;
    if (isFalseDietViolation(combinedText)) {
      console.log(`[filter] ❌ REMOVED false diet restriction: key="${item.key}" desc="${item.description}"`);
      return false;
    }

    return true;
  });
}

// Mapping of restriction codes to keywords that appear in AI bullet text
const RESTRICTION_KEYWORDS: Record<string, string[]> = {
  VEGAN: ['vegan'],
  VEGETARIAN: ['vegetarian'],
  HALAL: ['halal'],
  KOSHER: ['kosher'],
  GLUTEN_FREE: ['gluten-free', 'gluten free', 'celiac'],
  DAIRY_FREE: ['dairy-free', 'dairy free', 'lactose-free', 'lactose free'],
  KETO: ['keto'],
  PALEO: ['paleo'],
  NUT_FREE: ['nut-free', 'nut free'],
};

/**
 * Filter comparison bullet positives — remove "Dairy-free compatible" etc.
 * if the user's profile does NOT have that restriction.
 */
export function filterComparisonPositives(
  positives: string[],
  userRestrictions: string[],
): string[] {
  const restrictionSet = new Set(userRestrictions);

  return positives.filter((text) => {
    const lower = text.toLowerCase();

    for (const [restriction, keywords] of Object.entries(RESTRICTION_KEYWORDS)) {
      if (restrictionSet.has(restriction)) continue; // user has this restriction — keep it
      if (keywords.some((kw) => lower.includes(kw))) {
        console.log(`[filter] ❌ REMOVED irrelevant positive (user has no ${restriction}): "${text}"`);
        return false;
      }
    }

    return true;
  });
}

// Maps allergy codes to keywords that would appear in AI text about traces/allergens
const ALLERGY_SUBSTANCE_KEYWORDS: Record<string, string[]> = {
  PEANUTS: ['peanut'],
  TREE_NUTS: ['nut', 'almond', 'walnut', 'cashew', 'hazelnut', 'pistachio', 'pecan', 'macadamia'],
  GLUTEN: ['gluten', 'wheat', 'barley', 'rye'],
  DAIRY: ['milk', 'dairy', 'lactose', 'whey', 'casein', 'cream', 'butter', 'cheese'],
  SOY: ['soy', 'soja'],
  EGGS: ['egg'],
  SHELLFISH: ['shellfish', 'shrimp', 'crab', 'lobster', 'prawn'],
  SESAME: ['sesame'],
};

/**
 * Checks if a negative bullet about "trace" or "may contain" is relevant
 * to the user's actual allergies. Returns true if it should be REMOVED.
 */
function isIrrelevantTraceBullet(text: string, userAllergies: string[]): boolean {
  const lower = text.toLowerCase();
  if (!lower.includes('trace') && !lower.includes('may contain')) return false;

  // If user has no allergies at all, all trace mentions are irrelevant
  if (userAllergies.length === 0) return true;

  // Check if the trace substance matches any of the user's allergies
  for (const allergy of userAllergies) {
    const keywords = ALLERGY_SUBSTANCE_KEYWORDS[allergy];
    if (keywords && keywords.some((kw) => lower.includes(kw))) {
      return false; // relevant to user's allergy — keep it
    }
  }

  // Trace doesn't match any listed allergy → remove
  return true;
}

/**
 * Enhanced comparison bullet filter that also removes irrelevant trace/allergen negatives.
 */
export function filterComparisonBulletsWithAllergies(
  negatives: string[],
  userAllergies: string[],
): string[] {
  return filterComparisonBullets(negatives).filter((text) => {
    if (isIrrelevantTraceBullet(text, userAllergies)) {
      console.log(`[filter] ❌ REMOVED irrelevant trace/allergen (user allergies: [${userAllergies.join(',')}]): "${text}"`);
      return false;
    }
    return true;
  });
}

/**
 * Enhanced personal analysis filter that also removes irrelevant trace/allergen negatives.
 */
export function filterPersonalAnalysisNegativesWithAllergies<
  T extends { key: string; description: string; category: string },
>(negatives: T[], userAllergies: string[]): T[] {
  return filterPersonalAnalysisNegatives(negatives).filter((item) => {
    const text = `${item.key} ${item.description}`.toLowerCase();
    if (isIrrelevantTraceBullet(text, userAllergies)) {
      console.log(`[filter] ❌ REMOVED irrelevant trace/allergen item: key="${item.key}" desc="${item.description}"`);
      return false;
    }
    return true;
  });
}
