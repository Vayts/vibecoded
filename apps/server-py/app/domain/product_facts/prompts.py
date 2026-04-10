from app.domain.product_facts.schema import NormalizedProduct

PRODUCT_FACTS_SYSTEM_PROMPT = """You are a structured product classifier. Given food product data, return ONLY structured JSON classification facts.

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
- Return the Nutri-Score grade if available (a/b/c/d/e lowercase), else null."""


def build_product_facts_prompt(product: NormalizedProduct) -> str:
    parts: list[str] = []

    if product.get("product_name"):
        parts.append(f"Product: {product['product_name']}")
    if product.get("brands"):
        parts.append(f"Brand: {product['brands']}")
    if product.get("categories"):
        parts.append(f"Categories: {product['categories']}")

    ingredients = product.get("ingredients") or []
    if ingredients:
        parts.append(f"Ingredients: {', '.join(ingredients)}")
    elif product.get("ingredients_text"):
        parts.append(f"Ingredients: {product['ingredients_text']}")

    allergens = product.get("allergens") or []
    if allergens:
        parts.append(f"Allergens: {', '.join(allergens)}")

    traces = product.get("traces") or []
    if traces:
        parts.append(f"Traces: {', '.join(traces)}")

    n = product.get("nutrition") or {}
    nutrition_lines: list[str] = []
    if n.get("energy_kcal_100g") is not None:
        nutrition_lines.append(f"calories: {n['energy_kcal_100g']} kcal")
    if n.get("proteins_100g") is not None:
        nutrition_lines.append(f"protein: {n['proteins_100g']}g")
    if n.get("fat_100g") is not None:
        nutrition_lines.append(f"fat: {n['fat_100g']}g")
    if n.get("saturated_fat_100g") is not None:
        nutrition_lines.append(f"saturated fat: {n['saturated_fat_100g']}g")
    if n.get("carbohydrates_100g") is not None:
        nutrition_lines.append(f"carbs: {n['carbohydrates_100g']}g")
    if n.get("sugars_100g") is not None:
        nutrition_lines.append(f"sugars: {n['sugars_100g']}g")
    if n.get("fiber_100g") is not None:
        nutrition_lines.append(f"fiber: {n['fiber_100g']}g")
    if n.get("salt_100g") is not None:
        nutrition_lines.append(f"salt: {n['salt_100g']}g")
    if n.get("sodium_100g") is not None:
        nutrition_lines.append(f"sodium: {n['sodium_100g']}g")
    if nutrition_lines:
        parts.append(f"Nutrition per 100g: {', '.join(nutrition_lines)}")

    scores = product.get("scores") or {}
    if scores.get("nutriscore_grade"):
        parts.append(f"Nutri-Score: {scores['nutriscore_grade'].upper()}")

    category_tags = product.get("category_tags") or []
    if category_tags:
        parts.append(f"Category tags: {', '.join(category_tags)}")

    return "\n".join(parts)
