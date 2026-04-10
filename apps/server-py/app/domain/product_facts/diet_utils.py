import re
from typing import Optional

from app.domain.product_facts.schema import (
    DietCompatibility,
    DietCompatibilityReasons,
    DietCompatibilityValue,
    NormalizedProduct,
)

_PLANT_BASED_EXCLUDE = [
    re.compile(r"\b(?:cocoa|shea|peanut|almond|cashew|mango|avocado|kokum|sal)[-\s]+butter", re.I),
    re.compile(r"\b(?:coconut|almond|oat|soy|rice|hemp|cashew|hazelnut)[-\s]+(?:milk|cream|yogurt|cheese)", re.I),
    re.compile(r"\bbutterscotch\b", re.I),
    re.compile(r"\b(?:peanut|nut|almond|cashew|hazelnut|coconut|sunflower|seed)[-]butter", re.I),
]

_VEGAN_TOKENS = [
    "meat",
    "beef",
    "chicken",
    "pork",
    "fish",
    "tuna",
    "salmon",
    "shellfish",
    "shrimp",
    "dairy",
    "milk",
    "whey",
    "butter",
    "cheese",
    "cream",
    "yogurt",
    "egg",
    "honey",
    "gelatin",
    "lard",
    "tallow",
    "bacon",
    "ham",
    "sausage",
    "turkey",
    "lamb",
    "duck",
    "collagen",
    "casein",
    "lactose",
]
_VEGETARIAN_TOKENS = [
    "meat",
    "beef",
    "chicken",
    "pork",
    "fish",
    "tuna",
    "salmon",
    "shellfish",
    "shrimp",
    "gelatin",
    "lard",
    "tallow",
    "bacon",
    "ham",
    "sausage",
    "turkey",
    "lamb",
    "duck",
    "collagen",
    "carmine",
]
_HALAL_TOKENS = ["pork", "bacon", "ham", "lard", "wine", "beer", "rum", "alcohol", "sausage", "salami", "prosciutto"]
_KOSHER_TOKENS = [
    "pork",
    "bacon",
    "ham",
    "shellfish",
    "shrimp",
    "crab",
    "lobster",
    "lard",
    "sausage",
    "salami",
    "prosciutto",
]
_GLUTEN_FREE_TOKENS = [
    "wheat",
    "barley",
    "rye",
    "spelt",
    "semolina",
    "bulgur",
    "malt",
    "seitan",
    "farro",
    "durum",
    "gluten",
]
_DAIRY_FREE_TOKENS = ["milk", "cream", "butter", "cheese", "yogurt", "whey", "casein", "lactose", "dairy"]
_NUT_FREE_TOKENS = [
    "peanut",
    "almond",
    "walnut",
    "cashew",
    "hazelnut",
    "pistachio",
    "macadamia",
    "pecan",
    "tree nut",
    "nut",
]

_DIET_TOKEN_MAP: dict[str, dict] = {
    "vegan": {"tokens": _VEGAN_TOKENS, "exclude": _PLANT_BASED_EXCLUDE},
    "vegetarian": {"tokens": _VEGETARIAN_TOKENS},
    "halal": {"tokens": _HALAL_TOKENS},
    "kosher": {"tokens": _KOSHER_TOKENS},
    "glutenFree": {"tokens": _GLUTEN_FREE_TOKENS},
    "dairyFree": {"tokens": _DAIRY_FREE_TOKENS, "exclude": _PLANT_BASED_EXCLUDE},
    "nutFree": {"tokens": _NUT_FREE_TOKENS},
}


def _escape_re(s: str) -> str:
    return re.escape(s)


def _has_token(pool: list[str], tokens: list[str], exclude: Optional[list[re.Pattern]] = None) -> bool:
    excl = exclude or []
    for text in pool:
        for token in tokens:
            pattern = re.compile(rf"\b{_escape_re(token)}s?\b", re.I)
            if pattern.search(text):
                if not any(ex.search(text) for ex in excl):
                    return True
    return False


def _find_matching_token(
    pool: list[str], tokens: list[str], exclude: Optional[list[re.Pattern]] = None
) -> Optional[str]:
    excl = exclude or []
    for text in pool:
        for token in tokens:
            pattern = re.compile(rf"\b{_escape_re(token)}s?\b", re.I)
            if pattern.search(text):
                if not any(ex.search(text) for ex in excl):
                    return token
    return None


def _detect_single_diet(
    pool: list[str], tokens: list[str], exclude: Optional[list[re.Pattern]] = None
) -> DietCompatibilityValue:
    if not pool:
        return "unclear"
    if _has_token(pool, tokens, exclude or []):
        return "incompatible"
    return "compatible"


def _get_search_pool(product: NormalizedProduct) -> list[str]:
    pool = [
        *(product.get("ingredients") or []),
        *(product.get("allergens") or []),
        *(product.get("additives") or []),
        product.get("ingredients_text") or "",
        product.get("product_name") or "",
        *(product.get("category_tags") or []),
        product.get("categories") or "",
    ]
    return [v.lower() for v in pool if v]


def detect_diet_compatibility_with_reasons(
    product: NormalizedProduct,
) -> tuple[DietCompatibility, DietCompatibilityReasons]:
    pool = _get_search_pool(product)
    has_ingredients = bool(product.get("ingredients")) or bool(product.get("ingredients_text"))

    if not has_ingredients:
        compat: DietCompatibility = {
            "vegan": "unclear",
            "vegetarian": "unclear",
            "halal": "unclear",
            "kosher": "unclear",
            "glutenFree": "unclear",
            "dairyFree": "unclear",
            "nutFree": "unclear",
        }
        reasons: DietCompatibilityReasons = {
            "vegan": "Ingredients not available",
            "vegetarian": "Ingredients not available",
            "halal": "Ingredients not available",
            "kosher": "Ingredients not available",
            "glutenFree": "Ingredients not available",
            "dairyFree": "Ingredients not available",
            "nutFree": "Ingredients not available",
        }
        return compat, reasons

    compatibility: DietCompatibility = {}  # type: ignore[typeddict-item]
    diet_reasons: DietCompatibilityReasons = {}

    for key, cfg in _DIET_TOKEN_MAP.items():
        tokens: list[str] = cfg["tokens"]
        exclude: list[re.Pattern] = cfg.get("exclude", [])
        value = _detect_single_diet(pool, tokens, exclude)
        compatibility[key] = value  # type: ignore[literal-required]

        if value == "incompatible":
            match = _find_matching_token(pool, tokens, exclude)
            diet_reasons[key] = f"Contains {match}" if match else None  # type: ignore[literal-required]
        elif value == "unclear":
            diet_reasons[key] = "Insufficient ingredient data"  # type: ignore[literal-required]
        else:
            diet_reasons[key] = None  # type: ignore[literal-required]

    return compatibility, diet_reasons
