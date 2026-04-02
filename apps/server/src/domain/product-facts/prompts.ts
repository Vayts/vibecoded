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
  if (n.energy_kcal_100g != null) nutritionLines.push(`calories: ${n.energy_kcal_100g} kcal`);
  if (n.proteins_100g != null) nutritionLines.push(`protein: ${n.proteins_100g}g`);
  if (n.fat_100g != null) nutritionLines.push(`fat: ${n.fat_100g}g`);
  if (n.saturated_fat_100g != null) nutritionLines.push(`saturated fat: ${n.saturated_fat_100g}g`);
  if (n.carbohydrates_100g != null) nutritionLines.push(`carbs: ${n.carbohydrates_100g}g`);
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

export const PRODUCT_FACTS_SYSTEM_PROMPT = `You are a structured product fact extractor. Given food product data, return ONLY structured JSON facts.

RULES:
- Return ONLY the JSON object matching the required schema. No prose, no explanation.
- Do NOT compute any score or recommendation.
- Do NOT invent missing fields. Use null for unknown values.
- For diet compatibility: use "compatible" only when clearly safe, "incompatible" when a known conflict exists, "unclear" when uncertain.
- For nutrition summary levels: use product-category-aware thresholds. A beverage with 10g sugar is "high", but a cereal with 10g sugar is "moderate".

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
- For "compatible" diets, set the reason to null or omit it.

PRODUCT TYPE — choose the single best match from this list:
beverage, dairy, yogurt, cheese, meat, fish, snack, sweet, cereal, sauce, bread, ready_meal, plant_protein, dessert, fruit_vegetable, other

NUTRITION SUMMARY LEVELS:
- sugarLevel: low (≤5g), moderate (5-12g), high (>12g) per 100g. For beverages: low (≤2.5g), moderate (2.5-6g), high (>6g).
- saltLevel: low (≤0.3g), moderate (0.3-1.0g), high (>1.0g) per 100g.
- calorieLevel: low (≤100kcal), moderate (100-250kcal), high (>250kcal) per 100g. For beverages: low (≤20kcal), moderate (20-50kcal), high (>50kcal).
- proteinLevel: low (<3g), moderate (3-8g), high (>8g) per 100g.
- fiberLevel: low (<2g), moderate (2-5g), high (>5g) per 100g.
- saturatedFatLevel: low (<1.5g), moderate (1.5-5g), high (>5g) per 100g.
- If the nutrition value is missing, use "unknown".

NUTRI GRADE:
- Return the Nutri-Score grade if available (a/b/c/d/e lowercase), else null.`;
