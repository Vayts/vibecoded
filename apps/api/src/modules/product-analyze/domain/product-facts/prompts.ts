import type { NormalizedProduct } from '@acme/shared';

/**
 * Build the AI prompt for structured product fact extraction.
 * AI must return only structured facts — no scores, no recommendations.
 */
export const buildProductFactsPrompt = (product: NormalizedProduct): string => {
  const parts: string[] = [];

  if (product.product_name) {
    parts.push(`Product: ${product.product_name}`);
  }
  if (product.brands) {
    parts.push(`Brand: ${product.brands}`);
  }
  if (product.categories) {
    parts.push(`Categories: ${product.categories}`);
  }
  if (product.ingredients.length > 0) {
    parts.push(`Ingredients: ${product.ingredients.join(', ')}`);
  } else if (product.ingredients_text) {
    parts.push(`Ingredients: ${product.ingredients_text}`);
  }
  if (product.allergens.length > 0) {
    parts.push(`Allergens: ${product.allergens.join(', ')}`);
  }
  if (product.traces.length > 0) {
    parts.push(`Traces: ${product.traces.join(', ')}`);
  }

  const nutritionLines: string[] = [];
  const n = product.nutrition;
  if (n.energy_kcal_100g != null)
    nutritionLines.push(`calories: ${n.energy_kcal_100g} kcal`);
  if (n.proteins_100g != null)
    nutritionLines.push(`protein: ${n.proteins_100g}g`);
  if (n.fat_100g != null) nutritionLines.push(`fat: ${n.fat_100g}g`);
  if (n.saturated_fat_100g != null)
    nutritionLines.push(`saturated fat: ${n.saturated_fat_100g}g`);
  if (n.carbohydrates_100g != null)
    nutritionLines.push(`carbs: ${n.carbohydrates_100g}g`);
  if (n.sugars_100g != null) nutritionLines.push(`sugars: ${n.sugars_100g}g`);
  if (n.fiber_100g != null) nutritionLines.push(`fiber: ${n.fiber_100g}g`);
  if (n.salt_100g != null) nutritionLines.push(`salt: ${n.salt_100g}g`);
  if (n.sodium_100g != null) nutritionLines.push(`sodium: ${n.sodium_100g}g`);
  if (nutritionLines.length > 0) {
    parts.push(`Nutrition per 100g: ${nutritionLines.join(', ')}`);
  }

  if (product.scores.nutriscore_grade) {
    parts.push(`Nutri-Score: ${product.scores.nutriscore_grade.toUpperCase()}`);
  }
  if (product.category_tags.length > 0) {
    parts.push(`Category tags: ${product.category_tags.join(', ')}`);
  }

  return parts.join('\n');
};

export const PRODUCT_FACTS_SYSTEM_PROMPT = `You are a structured product classifier. Given food product data, return ONLY structured JSON classification facts.

RULES:
- Return ONLY the JSON object matching the required schema. No prose, no explanation.
- Do NOT compute any score or recommendation.
- Do NOT return any nutrition values — those come from the product database, not from you.
- Do NOT invent missing fields. Use null for unknown values.
- For diet compatibility: use "compatible" only when clearly safe, "incompatible" when a known conflict exists, "unclear" when uncertain.

DIET COMPATIBILITY RULES:
- vegan: incompatible if any animal product (meat, fish, dairy, eggs, honey, gelatin, lard, etc.) is present
- vegetarian: incompatible if meat, fish, gelatin, lard, collagen, carmine is present
- halal: incompatible if pork, alcohol, lard, or pork derivatives are present
- kosher: incompatible if pork, shellfish, or mixing meat with dairy
- glutenFree: incompatible if wheat, barley, rye, spelt, semolina, malt, seitan is present
- dairyFree: incompatible if milk, cream, butter, cheese, whey, casein, lactose is present
- nutFree: incompatible if peanut, almond, walnut, cashew, hazelnut, pistachio, or other tree nut is present
- When ingredients are ambiguous or missing, return "unclear" — never guess.

DIET COMPATIBILITY REASONS:
- For each diet that is "incompatible" or "unclear", provide a short reason in dietCompatibilityReasons.
- Keep it very short — just name the conflicting ingredient(s) or the ambiguity. Examples: "Contains milk and eggs", "Contains pork (lard)", "Gelatin source unclear", "Ingredients not available".
- For "compatible" diets, set the reason to null. Do NOT use ".", "", or any placeholder — use null only.

PRODUCT TYPE — choose the single best match from this list:
beverage, dairy, yogurt, cheese, meat, fish, snack, sweet, cereal, sauce, bread, ready_meal, plant_protein, dessert, fruit_vegetable, other

NUTRI GRADE:
- Return the Nutri-Score grade if available (a/b/c/d/e lowercase), else null.`;
