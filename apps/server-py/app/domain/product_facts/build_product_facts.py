from typing import Optional

from app.domain.product_facts.diet_utils import detect_diet_compatibility_with_reasons
from app.domain.product_facts.nutrition_utils import build_nutrition_summary
from app.domain.product_facts.product_type_utils import detect_product_type
from app.domain.product_facts.schema import (
    AiClassification,
    DietCompatibilityReasons,
    NormalizedProduct,
    ProductFacts,
    ProductType,
)

_JUNK = {".", "-", "/", "n/a", "none", "N/A", ""}


def _sanitize_reasons(reasons: Optional[DietCompatibilityReasons]) -> Optional[DietCompatibilityReasons]:
    if not reasons:
        return None
    cleaned: DietCompatibilityReasons = {}
    for key, value in reasons.items():
        if isinstance(value, str) and (value.strip() in _JUNK or len(value.strip()) <= 1):
            cleaned[key] = None  # type: ignore[literal-required]
        else:
            cleaned[key] = value  # type: ignore[literal-required]
    return cleaned


def build_classification_from_data(product: NormalizedProduct) -> AiClassification:
    product_type: Optional[ProductType] = detect_product_type(product)
    compatibility, reasons = detect_diet_compatibility_with_reasons(product)
    nutri_grade_raw = (product.get("scores") or {}).get("nutriscore_grade")
    nutri_grade = nutri_grade_raw.lower() if nutri_grade_raw else None

    return {
        "productType": product_type,
        "dietCompatibility": compatibility,
        "dietCompatibilityReasons": reasons,
        "nutriGrade": nutri_grade,  # type: ignore[typeddict-item]
    }


def has_nutrition_data(product: NormalizedProduct) -> bool:
    n = product.get("nutrition") or {}
    return any(
        v is not None and v > 0
        for v in [
            n.get("energy_kcal_100g"),
            n.get("proteins_100g"),
            n.get("fat_100g"),
            n.get("carbohydrates_100g"),
            n.get("sugars_100g"),
        ]
    )


def build_product_facts(classification: AiClassification, nutrition_facts: dict) -> ProductFacts:
    product_type = classification["productType"]

    return {
        "productType": product_type,
        "dietCompatibility": classification["dietCompatibility"],
        "dietCompatibilityReasons": _sanitize_reasons(classification.get("dietCompatibilityReasons")),
        "nutritionFacts": nutrition_facts,  # type: ignore[typeddict-item]
        "nutritionSummary": build_nutrition_summary(nutrition_facts, product_type),  # type: ignore[arg-type]
        "nutriGrade": classification.get("nutriGrade"),
    }
