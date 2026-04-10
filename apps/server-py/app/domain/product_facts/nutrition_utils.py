from typing import Optional

from app.domain.product_facts.schema import (
    NormalizedProduct,
    NutritionFacts,
    NutritionLevel,
    NutritionSummary,
    ProductType,
)


def build_nutrition_facts(product: NormalizedProduct) -> NutritionFacts:
    n = product.get("nutrition") or {}
    return {
        "calories": n.get("energy_kcal_100g"),
        "protein": n.get("proteins_100g"),
        "fat": n.get("fat_100g"),
        "saturatedFat": n.get("saturated_fat_100g"),
        "carbs": n.get("carbohydrates_100g"),
        "sugars": n.get("sugars_100g"),
        "fiber": n.get("fiber_100g"),
        "salt": n.get("salt_100g"),
        "sodium": n.get("sodium_100g"),
    }


def _classify_level(value: Optional[float], low: float, high: float) -> NutritionLevel:
    if value is None:
        return "unknown"
    if value <= low:
        return "low"
    if value > high:
        return "high"
    return "moderate"


def build_nutrition_summary(facts: NutritionFacts, product_type: Optional[ProductType]) -> NutritionSummary:
    beverage = product_type == "beverage"

    return {
        "sugarLevel": _classify_level(facts["sugars"], 2.5 if beverage else 5, 6 if beverage else 12),
        "saltLevel": _classify_level(facts["salt"], 0.3, 1.0),
        "calorieLevel": _classify_level(facts["calories"], 20 if beverage else 100, 50 if beverage else 250),
        "proteinLevel": _classify_level(facts["protein"], 3, 8),
        "fiberLevel": _classify_level(facts["fiber"], 2, 5),
        "saturatedFatLevel": _classify_level(facts["saturatedFat"], 1.5, 5),
    }
