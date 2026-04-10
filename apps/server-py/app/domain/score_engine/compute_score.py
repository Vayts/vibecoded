"""Deterministic product score engine — Python port of compute-score.ts."""

from typing import Optional

from app.domain.product_facts.schema import (
    FitLabel,
    IngredientAnalysis,
    NutritionLevel,
    OnboardingProfile,
    ProductFacts,
    ProductType,
    ProfileProductScore,
    ScoreBreakdown,
    ScoreBreakdownStep,
    ScoreReason,
)

# ============================================================
# Score constants
# ============================================================

_BASE_SCORE = 55
_MAX_SCORE = 100
_MIN_SCORE = 0


def _clamp(score: float) -> float:
    return max(_MIN_SCORE, min(_MAX_SCORE, score))


def _fit_label(score: float) -> FitLabel:
    if score >= 80:
        return "great_fit"
    if score >= 60:
        return "good_fit"
    if score >= 40:
        return "neutral"
    return "poor_fit"


# ============================================================
# Category-aware nutrition thresholds & impact weights
# ============================================================


class _NutrientProfile:
    __slots__ = ("low", "high", "good_impact", "bad_impact")

    def __init__(self, low: float, high: float, good_impact: float, bad_impact: float) -> None:
        self.low = low
        self.high = high
        self.good_impact = good_impact
        self.bad_impact = bad_impact


class _CategoryProfile:
    __slots__ = ("sugar", "salt", "saturated_fat", "calories", "protein", "fiber", "skip")

    def __init__(
        self,
        sugar: _NutrientProfile,
        salt: _NutrientProfile,
        saturated_fat: _NutrientProfile,
        calories: _NutrientProfile,
        protein: _NutrientProfile,
        fiber: _NutrientProfile,
        skip: frozenset[str],
    ) -> None:
        self.sugar = sugar
        self.salt = salt
        self.saturated_fat = saturated_fat
        self.calories = calories
        self.protein = protein
        self.fiber = fiber
        self.skip = skip


_NO_SKIP: frozenset[str] = frozenset()

_DEFAULT = _CategoryProfile(
    sugar=_NutrientProfile(5, 12.5, 10, -15),
    salt=_NutrientProfile(0.3, 1.5, 5, -10),
    saturated_fat=_NutrientProfile(1.5, 5, 5, -10),
    calories=_NutrientProfile(100, 250, 5, -10),
    protein=_NutrientProfile(5, 15, 10, -5),
    fiber=_NutrientProfile(1.5, 5, 8, -5),
    skip=_NO_SKIP,
)


def _merge(base: _CategoryProfile, **overrides: object) -> _CategoryProfile:
    return _CategoryProfile(
        sugar=overrides.get("sugar", base.sugar),  # type: ignore[arg-type]
        salt=overrides.get("salt", base.salt),  # type: ignore[arg-type]
        saturated_fat=overrides.get("saturated_fat", base.saturated_fat),  # type: ignore[arg-type]
        calories=overrides.get("calories", base.calories),  # type: ignore[arg-type]
        protein=overrides.get("protein", base.protein),  # type: ignore[arg-type]
        fiber=overrides.get("fiber", base.fiber),  # type: ignore[arg-type]
        skip=overrides.get("skip", base.skip),  # type: ignore[arg-type]
    )


_CATEGORY_PROFILES: dict[str, _CategoryProfile] = {
    "beverage": _merge(
        _DEFAULT,
        sugar=_NutrientProfile(2.5, 8, 8, -15),
        salt=_NutrientProfile(0.1, 0.5, 0, -8),
        saturated_fat=_NutrientProfile(0.5, 2, 0, -8),
        calories=_NutrientProfile(20, 50, 2, -10),
        protein=_NutrientProfile(1, 5, 0, -3),
        fiber=_NutrientProfile(0.5, 2, 0, -3),
        skip=frozenset(["protein", "fiber"]),
    ),
    "dairy": _merge(
        _DEFAULT,
        sugar=_NutrientProfile(5, 15, 8, -10),
        saturated_fat=_NutrientProfile(2, 6, 5, -8),
        protein=_NutrientProfile(3, 10, 10, -5),
        skip=frozenset(["fiber"]),
    ),
    "yogurt": _merge(
        _DEFAULT,
        sugar=_NutrientProfile(5, 15, 8, -12),
        saturated_fat=_NutrientProfile(1, 4, 5, -8),
        protein=_NutrientProfile(3, 8, 10, -5),
        calories=_NutrientProfile(50, 120, 5, -8),
        skip=frozenset(["fiber"]),
    ),
    "cheese": _merge(
        _DEFAULT,
        salt=_NutrientProfile(0.5, 2, 3, -6),
        saturated_fat=_NutrientProfile(5, 15, 3, -6),
        calories=_NutrientProfile(200, 400, 3, -6),
        protein=_NutrientProfile(10, 25, 8, -3),
        skip=frozenset(["fiber", "sugar"]),
    ),
    "meat": _merge(
        _DEFAULT,
        saturated_fat=_NutrientProfile(2, 8, 5, -8),
        calories=_NutrientProfile(100, 300, 3, -8),
        protein=_NutrientProfile(15, 25, 8, -5),
        salt=_NutrientProfile(0.3, 2, 3, -8),
        skip=frozenset(["fiber", "sugar"]),
    ),
    "fish": _merge(
        _DEFAULT,
        saturated_fat=_NutrientProfile(1, 5, 5, -6),
        calories=_NutrientProfile(80, 250, 3, -6),
        protein=_NutrientProfile(15, 25, 10, -5),
        skip=frozenset(["fiber", "sugar"]),
    ),
    "snack": _merge(
        _DEFAULT,
        sugar=_NutrientProfile(5, 10, 0, -14),
        salt=_NutrientProfile(0.5, 2, 0, -12),
        saturated_fat=_NutrientProfile(3, 10, 0, -10),
        calories=_NutrientProfile(200, 350, 0, -12),
        fiber=_NutrientProfile(2, 6, 6, -3),
    ),
    "sweet": _merge(
        _DEFAULT,
        sugar=_NutrientProfile(15, 40, 0, -12),
        saturated_fat=_NutrientProfile(3, 12, 0, -8),
        calories=_NutrientProfile(200, 350, 0, -8),
        skip=frozenset(["protein", "fiber"]),
    ),
    "dessert": _merge(
        _DEFAULT,
        sugar=_NutrientProfile(15, 40, 0, -12),
        saturated_fat=_NutrientProfile(3, 12, 0, -8),
        calories=_NutrientProfile(200, 350, 0, -8),
        skip=frozenset(["protein", "fiber"]),
    ),
    "cereal": _merge(
        _DEFAULT,
        sugar=_NutrientProfile(5, 20, 8, -12),
        fiber=_NutrientProfile(3, 8, 10, -8),
        calories=_NutrientProfile(150, 400, 3, -6),
    ),
    "bread": _merge(
        _DEFAULT,
        salt=_NutrientProfile(0.5, 1.5, 3, -8),
        fiber=_NutrientProfile(3, 6, 10, -8),
        calories=_NutrientProfile(200, 350, 3, -5),
    ),
    "sauce": _merge(
        _DEFAULT,
        sugar=_NutrientProfile(5, 25, 0, -10),
        salt=_NutrientProfile(1, 4, 0, -10),
        calories=_NutrientProfile(50, 200, 0, -8),
        saturated_fat=_NutrientProfile(2, 8, 0, -8),
        skip=frozenset(["protein", "fiber"]),
    ),
    "ready_meal": _merge(
        _DEFAULT,
        salt=_NutrientProfile(0.5, 2, 5, -10),
        saturated_fat=_NutrientProfile(2, 7, 5, -8),
        calories=_NutrientProfile(100, 250, 5, -8),
        protein=_NutrientProfile(8, 20, 10, -5),
        fiber=_NutrientProfile(2, 5, 8, -5),
    ),
    "plant_protein": _merge(
        _DEFAULT,
        protein=_NutrientProfile(10, 20, 10, -8),
        fiber=_NutrientProfile(3, 8, 8, -5),
        salt=_NutrientProfile(0.5, 2, 3, -8),
    ),
    "fruit_vegetable": _merge(
        _DEFAULT,
        sugar=_NutrientProfile(5, 15, 5, -8),
        calories=_NutrientProfile(30, 80, 5, -5),
        fiber=_NutrientProfile(2, 5, 10, -5),
        skip=frozenset(["protein"]),
    ),
}

_PRODUCT_TYPE_DESCRIPTIONS: dict[str, str] = {
    "beverage": "beverages",
    "dairy": "dairy products",
    "yogurt": "yogurts",
    "cheese": "cheeses",
    "meat": "meat products",
    "fish": "fish products",
    "snack": "snacks",
    "sweet": "sweets",
    "cereal": "cereals",
    "sauce": "sauces",
    "bread": "bread products",
    "ready_meal": "ready meals",
    "plant_protein": "plant protein products",
    "dessert": "desserts",
    "fruit_vegetable": "fruits and vegetables",
    "other": "products like this",
    "unknown": "products like this",
}


def _get_category_profile(product_type: Optional[ProductType]) -> _CategoryProfile:
    if product_type and product_type in _CATEGORY_PROFILES:
        return _CATEGORY_PROFILES[product_type]
    return _DEFAULT


def _compute_nutrition_level(value: Optional[float], low: float, high: float) -> NutritionLevel:
    if value is None:
        return "unknown"
    if value <= low:
        return "low"
    if value >= high:
        return "high"
    return "moderate"


def _with_type_ctx(desc: str, product_type: Optional[str]) -> str:
    category = _PRODUCT_TYPE_DESCRIPTIONS.get(product_type or "unknown", "products like this")
    return f"{desc} for {category}"


# ============================================================
# Nutrition scoring
# ============================================================


def _nutrition_reason(
    key: str,
    label: str,
    level: NutritionLevel,
    value: Optional[float],
    unit: str,
    polarity: str,
    good_desc: str,
    bad_desc: str,
    moderate_desc: str,
    good_impact: float,
    bad_impact: float,
    product_type: Optional[str],
) -> Optional[ScoreReason]:
    if level == "unknown":
        return None
    if level == "moderate":
        if value is None or value == 0:
            return None
        return {
            "key": key,
            "label": label,
            "description": _with_type_ctx(moderate_desc, product_type),
            "value": value,
            "unit": unit,
            "impact": 0,
            "kind": "neutral",
            "source": "nutrition",
        }
    is_good = (polarity == "low-is-good" and level == "low") or (polarity == "high-is-good" and level == "high")
    return {
        "key": key,
        "label": label,
        "description": _with_type_ctx(good_desc if is_good else bad_desc, product_type),
        "value": value,
        "unit": unit,
        "impact": good_impact if is_good else bad_impact,
        "kind": "positive" if is_good else "negative",
        "source": "nutrition",
    }


def _neutral_nutrition_reason(
    key: str, label: str, value: Optional[float], unit: str, desc: str, product_type: Optional[str]
) -> Optional[ScoreReason]:
    if value is None or value == 0:
        return None
    return {
        "key": key,
        "label": label,
        "description": _with_type_ctx(desc, product_type),
        "value": value,
        "unit": unit,
        "impact": 0,
        "kind": "neutral",
        "source": "nutrition",
    }


def _evaluate_nutrition_facts(facts: ProductFacts) -> list[ScoreReason]:
    reasons: list[ScoreReason] = []
    n = facts["nutritionFacts"]
    cat = _get_category_profile(facts.get("productType"))
    skip = cat.skip
    pt = facts.get("productType")

    levels = {
        "sugar": _compute_nutrition_level(n.get("sugars"), cat.sugar.low, cat.sugar.high),
        "salt": _compute_nutrition_level(n.get("salt"), cat.salt.low, cat.salt.high),
        "sat_fat": _compute_nutrition_level(n.get("saturatedFat"), cat.saturated_fat.low, cat.saturated_fat.high),
        "calories": _compute_nutrition_level(n.get("calories"), cat.calories.low, cat.calories.high),
        "protein": _compute_nutrition_level(n.get("protein"), cat.protein.low, cat.protein.high),
        "fiber": _compute_nutrition_level(n.get("fiber"), cat.fiber.low, cat.fiber.high),
    }

    if "sugar" not in skip:
        r = _nutrition_reason(
            "sugar",
            "Sugar",
            levels["sugar"],
            n.get("sugars"),
            "g",
            "low-is-good",
            "Low sugar content",
            "High sugar content",
            "Moderate sugar content",
            cat.sugar.good_impact,
            cat.sugar.bad_impact,
            pt,
        )
        if r:
            reasons.append(r)
    else:
        r = _neutral_nutrition_reason("sugar", "Sugar", n.get("sugars"), "g", "Sugar content", pt)
        if r:
            reasons.append(r)

    if "salt" not in skip:
        r = _nutrition_reason(
            "salt",
            "Salt",
            levels["salt"],
            n.get("salt"),
            "g",
            "low-is-good",
            "Low salt content",
            "High salt content",
            "Moderate salt content",
            cat.salt.good_impact,
            cat.salt.bad_impact,
            pt,
        )
        if r:
            reasons.append(r)
    else:
        r = _neutral_nutrition_reason("salt", "Salt", n.get("salt"), "g", "Salt content", pt)
        if r:
            reasons.append(r)

    if "saturatedFat" not in skip:
        r = _nutrition_reason(
            "saturated-fat",
            "Saturated fat",
            levels["sat_fat"],
            n.get("saturatedFat"),
            "g",
            "low-is-good",
            "Low saturated fat",
            "High saturated fat",
            "Moderate saturated fat",
            cat.saturated_fat.good_impact,
            cat.saturated_fat.bad_impact,
            pt,
        )
        if r:
            reasons.append(r)
    else:
        r = _neutral_nutrition_reason(
            "saturated-fat", "Saturated fat", n.get("saturatedFat"), "g", "Saturated fat content", pt
        )
        if r:
            reasons.append(r)

    if "calories" not in skip:
        r = _nutrition_reason(
            "calories",
            "Calories",
            levels["calories"],
            n.get("calories"),
            "kcal",
            "low-is-good",
            "Low calorie density",
            "High calorie density",
            "Moderate calorie density",
            cat.calories.good_impact,
            cat.calories.bad_impact,
            pt,
        )
        if r:
            reasons.append(r)
    else:
        r = _neutral_nutrition_reason("calories", "Calories", n.get("calories"), "kcal", "Calorie content", pt)
        if r:
            reasons.append(r)

    if "protein" not in skip:
        r = _nutrition_reason(
            "protein",
            "Protein",
            levels["protein"],
            n.get("protein"),
            "g",
            "high-is-good",
            "High protein content",
            "Low protein content",
            "Moderate protein content",
            cat.protein.good_impact,
            cat.protein.bad_impact,
            pt,
        )
        if r:
            reasons.append(r)
    else:
        r = _neutral_nutrition_reason("protein", "Protein", n.get("protein"), "g", "Protein content", pt)
        if r:
            reasons.append(r)

    if "fiber" not in skip:
        r = _nutrition_reason(
            "fiber",
            "Fiber",
            levels["fiber"],
            n.get("fiber"),
            "g",
            "high-is-good",
            "High fiber content",
            "Low fiber content",
            "Moderate fiber content",
            cat.fiber.good_impact,
            cat.fiber.bad_impact,
            pt,
        )
        if r:
            reasons.append(r)
    else:
        r = _neutral_nutrition_reason("fiber", "Fiber", n.get("fiber"), "g", "Fiber content", pt)
        if r:
            reasons.append(r)

    # Always-neutral informational
    r = _neutral_nutrition_reason("fat", "Fat", n.get("fat"), "g", "Total fat content", pt)
    if r:
        reasons.append(r)
    r = _neutral_nutrition_reason("carbs", "Carbs", n.get("carbs"), "g", "Carbohydrate content", pt)
    if r:
        reasons.append(r)

    return reasons


# ============================================================
# Nutri grade scoring
# ============================================================

_NUTRI_GRADE_IMPACTS: dict[str, tuple[float, str, str]] = {
    "a": (15, "positive", "Excellent Nutri-Score grade (A)"),
    "b": (10, "positive", "Good Nutri-Score grade (B)"),
    "c": (0, "positive", "Average Nutri-Score grade (C)"),
    "d": (-10, "negative", "Below-average Nutri-Score grade (D)"),
    "e": (-15, "negative", "Poor Nutri-Score grade (E)"),
}


def _evaluate_nutri_grade(facts: ProductFacts) -> Optional[ScoreReason]:
    grade = facts.get("nutriGrade")
    if not grade:
        return None
    entry = _NUTRI_GRADE_IMPACTS.get(grade)
    if not entry or entry[0] == 0:
        return None
    impact, kind, desc = entry
    return {
        "key": "nutri-grade",
        "label": "Nutri-Score",
        "description": desc,
        "value": None,
        "unit": None,
        "impact": impact,
        "kind": kind,
        "source": "nutrition",
    }  # type: ignore[return-value]


# ============================================================
# Diet/restriction scoring
# ============================================================

_RESTRICTION_TO_DIET_KEY: dict[str, str] = {
    "VEGAN": "vegan",
    "VEGETARIAN": "vegetarian",
    "HALAL": "halal",
    "KOSHER": "kosher",
    "GLUTEN_FREE": "glutenFree",
    "DAIRY_FREE": "dairyFree",
    "NUT_FREE": "nutFree",
}
_RESTRICTION_LABELS: dict[str, str] = {
    "VEGAN": "Vegan",
    "VEGETARIAN": "Vegetarian",
    "HALAL": "Halal",
    "KOSHER": "Kosher",
    "GLUTEN_FREE": "Gluten-free",
    "DAIRY_FREE": "Dairy-free",
    "NUT_FREE": "Nut-free",
}


def _evaluate_restrictions(facts: ProductFacts, restrictions: list[str]) -> list[ScoreReason]:
    reasons: list[ScoreReason] = []
    compat = facts["dietCompatibility"]
    compat_reasons = facts.get("dietCompatibilityReasons") or {}

    for restriction in restrictions:
        diet_key = _RESTRICTION_TO_DIET_KEY.get(restriction)
        if not diet_key:
            continue
        value = compat.get(diet_key)  # type: ignore[arg-type]
        ai_reason = compat_reasons.get(diet_key)  # type: ignore[arg-type]
        label = _RESTRICTION_LABELS.get(restriction, restriction)
        key = f"restriction-{restriction.lower()}"

        if value == "incompatible":
            base_desc = f"Product is incompatible with your {label.lower()} diet"
            reasons.append(
                {
                    "key": key,
                    "label": f"{label} diet conflict",
                    "description": f"{base_desc}. {ai_reason}" if ai_reason else base_desc,
                    "value": None,
                    "unit": None,
                    "impact": -100,
                    "kind": "negative",
                    "source": "restriction",
                }
            )
        elif value == "unclear":
            base_desc = f"Cannot confirm {label.lower()} compatibility"
            reasons.append(
                {
                    "key": key,
                    "label": f"{label} unclear",
                    "description": f"{base_desc}. {ai_reason}" if ai_reason else base_desc,
                    "value": None,
                    "unit": None,
                    "impact": -1,
                    "kind": "negative",
                    "source": "restriction",
                }
            )
        elif value == "compatible":
            reasons.append(
                {
                    "key": key,
                    "label": f"{label} compatible",
                    "description": f"No conflict with your {label.lower()} diet detected",
                    "value": None,
                    "unit": None,
                    "impact": 5,
                    "kind": "positive",
                    "source": "restriction",
                }
            )

    return reasons  # type: ignore[return-value]


# ============================================================
# Allergen scoring
# ============================================================

_ALLERGY_LABELS: dict[str, str] = {
    "PEANUTS": "Peanuts",
    "TREE_NUTS": "Tree nuts",
    "GLUTEN": "Gluten",
    "DAIRY": "Dairy",
    "SOY": "Soy",
    "EGGS": "Eggs",
    "SHELLFISH": "Shellfish",
    "SESAME": "Sesame",
}
_ALLERGY_TO_DIET_KEY: dict[str, Optional[str]] = {
    "GLUTEN": "glutenFree",
    "DAIRY": "dairyFree",
    "PEANUTS": "nutFree",
    "TREE_NUTS": "nutFree",
}


def _evaluate_allergens(facts: ProductFacts, allergies: list[str]) -> list[ScoreReason]:
    reasons: list[ScoreReason] = []
    compat = facts["dietCompatibility"]
    compat_reasons = facts.get("dietCompatibilityReasons") or {}

    for allergy in allergies:
        if allergy == "OTHER":
            continue
        diet_key = _ALLERGY_TO_DIET_KEY.get(allergy)
        label = _ALLERGY_LABELS.get(allergy, allergy)
        key = f"allergen-{allergy.lower()}"

        if diet_key:
            value = compat.get(diet_key)  # type: ignore[arg-type]
            ai_reason = compat_reasons.get(diet_key)  # type: ignore[arg-type]
            if value == "incompatible":
                base_desc = f"Product may contain {label.lower()}, which conflicts with your allergy"
                reasons.append(
                    {
                        "key": key,
                        "label": f"{label} allergen conflict",
                        "description": f"{base_desc}. {ai_reason}" if ai_reason else base_desc,
                        "value": None,
                        "unit": None,
                        "impact": -50,
                        "kind": "negative",
                        "source": "allergen",
                    }
                )

    return reasons  # type: ignore[return-value]


def _evaluate_ingredient_flags(ingredient_analysis: Optional[IngredientAnalysis]) -> list[ScoreReason]:
    if not ingredient_analysis:
        return []
    reasons: list[ScoreReason] = []
    for ingredient in ingredient_analysis.get("ingredients", []):
        if ingredient.get("status") != "bad" or not ingredient.get("reason"):
            continue
        name = ingredient["name"]
        key = f"ingredient-flag-{name.lower().replace(' ', '-')}"
        reasons.append(
            {
                "key": key,
                "label": f"{name} flagged",
                "description": ingredient["reason"],
                "value": None,
                "unit": None,
                "impact": -50,
                "kind": "negative",
                "source": "allergen",
            }
        )
    return reasons  # type: ignore[return-value]


# ============================================================
# Goal-based scoring
# ============================================================


def _evaluate_goals(facts: ProductFacts, profile: OnboardingProfile) -> list[ScoreReason]:
    reasons: list[ScoreReason] = []
    n = facts["nutritionFacts"]
    cat = _get_category_profile(facts.get("productType"))
    pt = facts.get("productType")

    levels = {
        "sugar": _compute_nutrition_level(n.get("sugars"), cat.sugar.low, cat.sugar.high),
        "salt": _compute_nutrition_level(n.get("salt"), cat.salt.low, cat.salt.high),
        "calories": _compute_nutrition_level(n.get("calories"), cat.calories.low, cat.calories.high),
        "protein": _compute_nutrition_level(n.get("protein"), cat.protein.low, cat.protein.high),
        "fiber": _compute_nutrition_level(n.get("fiber"), cat.fiber.low, cat.fiber.high),
    }

    goal = profile.get("mainGoal")
    priorities = profile.get("nutritionPriorities") or []

    if goal == "WEIGHT_LOSS" and levels["calories"] == "high":
        reasons.append(
            {
                "key": "goal-weight-loss-calories",
                "label": "Weight loss goal",
                "description": "High calorie density conflicts with your weight loss goal",
                "value": n.get("calories"),
                "unit": "kcal",
                "impact": -10,
                "kind": "negative",
                "source": "goal",
            }
        )

    if goal == "MUSCLE_GAIN" and levels["protein"] == "high":
        reasons.append(
            {
                "key": "goal-muscle-gain-protein",
                "label": "Muscle gain goal",
                "description": "High protein supports your muscle gain goal",
                "value": n.get("protein"),
                "unit": "g",
                "impact": 10,
                "kind": "positive",
                "source": "goal",
            }
        )

    if goal == "MUSCLE_GAIN" and levels["protein"] == "low":
        reasons.append(
            {
                "key": "goal-muscle-gain-low-protein",
                "label": "Muscle gain goal",
                "description": "Low protein does not support your muscle gain goal",
                "value": n.get("protein"),
                "unit": "g",
                "impact": -8,
                "kind": "negative",
                "source": "goal",
            }
        )

    if goal == "DIABETES_CONTROL" and levels["sugar"] == "high":
        reasons.append(
            {
                "key": "goal-diabetes-sugar",
                "label": "Blood sugar management",
                "description": "High sugar content conflicts with your diabetes management goal",
                "value": n.get("sugars"),
                "unit": "g",
                "impact": -15,
                "kind": "negative",
                "source": "goal",
            }
        )

    if goal == "DIABETES_CONTROL" and levels["sugar"] == "low":
        reasons.append(
            {
                "key": "goal-diabetes-low-sugar",
                "label": "Blood sugar management",
                "description": "Low sugar supports your blood sugar management",
                "value": n.get("sugars"),
                "unit": "g",
                "impact": 10,
                "kind": "positive",
                "source": "goal",
            }
        )

    if "LOW_SUGAR" in priorities:
        if levels["sugar"] == "low":
            reasons.append(
                {
                    "key": "priority-low-sugar",
                    "label": "Low sugar priority",
                    "description": "Fits your low sugar preference",
                    "value": n.get("sugars"),
                    "unit": "g",
                    "impact": 8,
                    "kind": "positive",
                    "source": "goal",
                }
            )
        elif levels["sugar"] == "high":
            reasons.append(
                {
                    "key": "priority-low-sugar",
                    "label": "Low sugar priority",
                    "description": "Too high for your low sugar preference",
                    "value": n.get("sugars"),
                    "unit": "g",
                    "impact": -12,
                    "kind": "negative",
                    "source": "goal",
                }
            )

    if "LOW_SODIUM" in priorities:
        if levels["salt"] == "low":
            reasons.append(
                {
                    "key": "priority-low-sodium",
                    "label": "Low sodium priority",
                    "description": "Fits your low sodium preference",
                    "value": n.get("salt"),
                    "unit": "g",
                    "impact": 8,
                    "kind": "positive",
                    "source": "goal",
                }
            )
        elif levels["salt"] == "high":
            reasons.append(
                {
                    "key": "priority-low-sodium",
                    "label": "Low sodium priority",
                    "description": "Too salty for your low sodium preference",
                    "value": n.get("salt"),
                    "unit": "g",
                    "impact": -12,
                    "kind": "negative",
                    "source": "goal",
                }
            )

    if "HIGH_PROTEIN" in priorities:
        if levels["protein"] == "high":
            reasons.append(
                {
                    "key": "priority-high-protein",
                    "label": "High protein priority",
                    "description": "Supports your high protein preference",
                    "value": n.get("protein"),
                    "unit": "g",
                    "impact": 8,
                    "kind": "positive",
                    "source": "goal",
                }
            )
        elif levels["protein"] == "low":
            reasons.append(
                {
                    "key": "priority-high-protein",
                    "label": "High protein priority",
                    "description": "Low protein for your high protein preference",
                    "value": n.get("protein"),
                    "unit": "g",
                    "impact": -8,
                    "kind": "negative",
                    "source": "goal",
                }
            )

    if "HIGH_FIBER" in priorities:
        if levels["fiber"] == "high":
            reasons.append(
                {
                    "key": "priority-high-fiber",
                    "label": "High fiber priority",
                    "description": "Supports your high fiber preference",
                    "value": n.get("fiber"),
                    "unit": "g",
                    "impact": 8,
                    "kind": "positive",
                    "source": "goal",
                }
            )
        elif levels["fiber"] == "low":
            reasons.append(
                {
                    "key": "priority-high-fiber",
                    "label": "High fiber priority",
                    "description": "Low fiber for your preference",
                    "value": n.get("fiber"),
                    "unit": "g",
                    "impact": -6,
                    "kind": "negative",
                    "source": "goal",
                }
            )

    if "LOW_CARB" in priorities:
        carbs = n.get("carbs")
        if carbs is not None:
            if carbs <= 10:
                reasons.append(
                    {
                        "key": "priority-low-carb",
                        "label": "Low carb priority",
                        "description": "Low carbohydrate content fits your preference",
                        "value": carbs,
                        "unit": "g",
                        "impact": 8,
                        "kind": "positive",
                        "source": "goal",
                    }
                )
            elif carbs > 30:
                reasons.append(
                    {
                        "key": "priority-low-carb",
                        "label": "Low carb priority",
                        "description": "High carbohydrate content conflicts with your preference",
                        "value": carbs,
                        "unit": "g",
                        "impact": -10,
                        "kind": "negative",
                        "source": "goal",
                    }
                )

    return reasons  # type: ignore[return-value]


# ============================================================
# Main score engine
# ============================================================


def compute_profile_score(
    facts: ProductFacts,
    profile: OnboardingProfile,
    ingredient_analysis: Optional[IngredientAnalysis] = None,
) -> ProfileProductScore:
    all_reasons: list[ScoreReason] = [
        *_evaluate_nutrition_facts(facts),
        *([r] if (r := _evaluate_nutri_grade(facts)) else []),
        *_evaluate_restrictions(facts, profile.get("restrictions") or []),
        *_evaluate_allergens(facts, profile.get("allergies") or []),
        *_evaluate_ingredient_flags(ingredient_analysis),
        *_evaluate_goals(facts, profile),
    ]

    steps: list[ScoreBreakdownStep] = []
    running = float(_BASE_SCORE)

    for r in all_reasons:
        if r["impact"] == 0:
            continue
        running += r["impact"]
        steps.append(
            {
                "rule": f"{r['source']}:{r['key']}",
                "label": r["description"],
                "impact": r["impact"],
                "running": running,
            }
        )

    total_impact = running - _BASE_SCORE
    raw_score = running
    final_score = _clamp(raw_score)

    score_breakdown: ScoreBreakdown = {
        "baseScore": _BASE_SCORE,
        "steps": steps,
        "totalImpact": total_impact,
        "rawScore": raw_score,
        "finalScore": final_score,
    }

    positives = [r for r in all_reasons if r["kind"] in ("positive", "neutral")]
    negatives = [r for r in all_reasons if r["kind"] == "negative"]

    result: ProfileProductScore = {
        "profileId": profile["profileId"],
        "profileType": profile["profileType"],
        "name": profile["name"],
        "score": final_score,
        "fitLabel": _fit_label(final_score),
        "positives": positives,
        "negatives": negatives,
        "scoreBreakdown": score_breakdown,
    }
    return result


def compute_all_profile_scores(
    facts: ProductFacts,
    profiles: list[OnboardingProfile],
    per_profile_ingredients: Optional[dict[str, Optional[IngredientAnalysis]]] = None,
) -> list[ProfileProductScore]:
    results = []
    for profile in profiles:
        analysis = (per_profile_ingredients or {}).get(profile["profileId"])
        results.append(compute_profile_score(facts, profile, analysis))
    return results
