"""Normalize raw OpenFoodFacts API response to the internal NormalizedProduct dict."""

from typing import Any, Optional

_NULL_LIKE = {"null", "/null", "n/a", "none", "undefined", "-", "/", ""}


def _normalize_nullable_string(value: Any) -> Optional[str]:
    if not isinstance(value, str):
        return None
    normalized = value.strip()
    if normalized.lower() in _NULL_LIKE:
        return None
    return normalized if normalized else None


def _normalize_nullable_number(value: Any) -> Optional[float]:
    if isinstance(value, (int, float)) and not (isinstance(value, float) and (value != value)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    return None


def _clean_taxonomy_value(value: str) -> str:
    if ":" in value:
        value = ":".join(value.split(":")[1:])
    return value.replace("-", " ").replace("_", " ").strip()


def _normalize_string_array(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    result = []
    for entry in value:
        v = _normalize_nullable_string(entry)
        if v:
            result.append(v)
    return result


def _normalize_label_array(value: Any) -> list[str]:
    return [_clean_taxonomy_value(v) for v in _normalize_string_array(value)]


def _normalize_comma_separated_string(value: Any) -> list[str]:
    normalized = _normalize_nullable_string(value)
    if not normalized:
        return []
    return [entry.strip() for entry in normalized.split(",") if entry.strip()]


def _pick_localized_field(product: dict, base_key: str) -> Optional[str]:
    locale_candidates = [
        _normalize_nullable_string(product.get("lang")),
        _normalize_nullable_string(product.get("lc")),
    ]
    locale_candidates = [loc for loc in locale_candidates if loc]

    for locale in locale_candidates:
        val = _normalize_nullable_string(product.get(f"{base_key}_{locale}"))
        if val:
            return val

    val = _normalize_nullable_string(product.get(base_key))
    if val:
        return val

    for k, v in product.items():
        if k.startswith(f"{base_key}_") and _normalize_nullable_string(v):
            return _normalize_nullable_string(v)

    return None


def _normalize_ingredients(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    result = []
    for item in value:
        if not isinstance(item, dict):
            continue
        text = _normalize_nullable_string(item.get("text"))
        if text:
            result.append(text)
    return result


def _normalize_categories(product: dict) -> tuple[Optional[str], list[str]]:
    hierarchy_labels = _normalize_label_array(product.get("categories_hierarchy"))
    if hierarchy_labels:
        return ", ".join(hierarchy_labels), hierarchy_labels

    categories = _normalize_nullable_string(product.get("categories"))
    if not categories:
        return None, []

    category_tags = [_clean_taxonomy_value(t.strip()) for t in categories.split(",") if t.strip()]
    if category_tags:
        return ", ".join(category_tags), category_tags
    return _clean_taxonomy_value(categories), []


def _get_selected_image_url(
    selected_images: Optional[dict], image_type: str, locale_candidates: list[str]
) -> Optional[str]:
    if not selected_images:
        return None
    selected_image = selected_images.get(image_type)
    if not selected_image or not isinstance(selected_image, dict):
        return None
    display = selected_image.get("display")
    if not isinstance(display, dict):
        return None

    for locale in locale_candidates:
        val = _normalize_nullable_string(display.get(locale))
        if val:
            return val

    for v in display.values():
        val = _normalize_nullable_string(v)
        if val:
            return val

    return None


def normalize_openfoodfacts_product(barcode: str, product: dict) -> dict:
    """Return NormalizedProduct dict from raw OFF API product data."""
    locale_candidates = [
        _normalize_nullable_string(product.get("lang")),
        _normalize_nullable_string(product.get("lc")),
    ]
    locale_candidates = [loc for loc in locale_candidates if loc]

    selected_images: Optional[dict] = product.get("selected_images")
    categories, category_tags = _normalize_categories(product)
    nutriments: dict = product.get("nutriments") or {}
    countries_from_tags = _normalize_label_array(product.get("countries_tags"))

    return {
        "code": _normalize_nullable_string(product.get("code")) or barcode,
        "product_name": _pick_localized_field(product, "product_name"),
        "brands": _normalize_nullable_string(product.get("brands")),
        "image_url": _normalize_nullable_string(product.get("image_url")),
        "ingredients_text": _pick_localized_field(product, "ingredients_text"),
        "nutriscore_grade": _normalize_nullable_string(product.get("nutriscore_grade")),
        "categories": categories,
        "quantity": _normalize_nullable_string(product.get("quantity")),
        "serving_size": _normalize_nullable_string(product.get("serving_size")),
        "ingredients": _normalize_ingredients(product.get("ingredients")),
        "allergens": _normalize_label_array(product.get("allergens_tags")),
        "additives": _normalize_label_array(product.get("additives_tags")),
        "additives_count": _normalize_nullable_number(product.get("additives_n")),
        "traces": _normalize_label_array(product.get("traces_tags")),
        "countries": (
            countries_from_tags if countries_from_tags else _normalize_comma_separated_string(product.get("countries"))
        ),
        "category_tags": category_tags,
        "images": {
            "front_url": (
                _get_selected_image_url(selected_images, "front", locale_candidates)
                or _normalize_nullable_string(product.get("image_front_url"))
                or _normalize_nullable_string(product.get("image_url"))
            ),
            "ingredients_url": (
                _get_selected_image_url(selected_images, "ingredients", locale_candidates)
                or _normalize_nullable_string(product.get("image_ingredients_url"))
            ),
            "nutrition_url": (
                _get_selected_image_url(selected_images, "nutrition", locale_candidates)
                or _normalize_nullable_string(product.get("image_nutrition_url"))
            ),
        },
        "nutrition": {
            "energy_kcal_100g": _normalize_nullable_number(nutriments.get("energy-kcal_100g")),
            "proteins_100g": _normalize_nullable_number(nutriments.get("proteins_100g")),
            "fat_100g": _normalize_nullable_number(nutriments.get("fat_100g")),
            "saturated_fat_100g": _normalize_nullable_number(nutriments.get("saturated-fat_100g")),
            "carbohydrates_100g": _normalize_nullable_number(nutriments.get("carbohydrates_100g")),
            "sugars_100g": _normalize_nullable_number(nutriments.get("sugars_100g")),
            "fiber_100g": _normalize_nullable_number(nutriments.get("fiber_100g")),
            "salt_100g": _normalize_nullable_number(nutriments.get("salt_100g")),
            "sodium_100g": _normalize_nullable_number(nutriments.get("sodium_100g")),
        },
        "scores": {
            "nutriscore_grade": _normalize_nullable_string(product.get("nutriscore_grade")),
            "nutriscore_score": _normalize_nullable_number(product.get("nutriscore_score")),
            "ecoscore_grade": _normalize_nullable_string(product.get("ecoscore_grade")),
            "ecoscore_score": _normalize_nullable_number(product.get("ecoscore_score")),
        },
    }
