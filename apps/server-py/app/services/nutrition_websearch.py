"""Web search for missing nutrition data using OpenAI with web_search tool."""

import json
from typing import Optional

from loguru import logger
from openai import AsyncOpenAI

from app.core.config import settings
from app.domain.product_facts.schema import NutritionFacts

_SEARCH_PROMPT = """You are a nutrition data researcher. Given a product name and brand, search the web to find its NUTRITION FACTS per 100g.

SEARCH STRATEGY:
1. Search: "[product name] [brand] nutrition facts per 100g"
2. Search: "site:openfoodfacts.org [product name] [brand]"
3. Search: "[product name] [brand] пищевая ценность на 100г" (for Russian/Ukrainian products)
4. Try manufacturer website or major retailers if needed.

CRITICAL — PER 100g ONLY:
- ALL nutrition values MUST be per 100g (or per 100ml for liquids). NOT per serving, NOT per package.
- Many websites show nutrition per serving. You MUST convert to per 100g.
- VERIFY: carbs + protein + fat should roughly sum to less than 100g.

RULES:
- Round to 1 decimal place. Calories to nearest integer.
- If a value is not available, set to null. NEVER use 0 as placeholder.
- Use the SAME source for ALL values — do not mix sources.
- Prefer data from: OpenFoodFacts > manufacturer > major retailers > FatSecret > USDA.
- If no reliable source is found, return found: false."""

_SCHEMA = {
    "type": "object",
    "properties": {
        "found": {"type": "boolean"},
        "source": {"type": ["string", "null"]},
        "nutrition": {
            "type": ["object", "null"],
            "properties": {
                "energy_kcal_100g": {"type": ["number", "null"]},
                "proteins_100g": {"type": ["number", "null"]},
                "fat_100g": {"type": ["number", "null"]},
                "saturated_fat_100g": {"type": ["number", "null"]},
                "carbohydrates_100g": {"type": ["number", "null"]},
                "sugars_100g": {"type": ["number", "null"]},
                "fiber_100g": {"type": ["number", "null"]},
                "salt_100g": {"type": ["number", "null"]},
                "sodium_100g": {"type": ["number", "null"]},
            },
        },
    },
    "required": ["found", "source", "nutrition"],
    "additionalProperties": False,
}

_PER_100G_MAX = {
    "energy_kcal_100g": 900,
    "proteins_100g": 100,
    "fat_100g": 100,
    "saturated_fat_100g": 100,
    "carbohydrates_100g": 100,
    "sugars_100g": 100,
    "fiber_100g": 100,
    "salt_100g": 100,
    "sodium_100g": 40,
}


def _round1(v: Optional[float]) -> Optional[float]:
    return round(v * 10) / 10 if v is not None else None


def _sanitize_nutrition(raw: dict) -> dict:
    keys = list(_PER_100G_MAX.keys())
    over = sum(1 for k in keys if raw.get(k) is not None and raw[k] > _PER_100G_MAX[k])

    if over >= 3:
        logger.warning(f"[NutritionSearch] {over} over-max values — scaling down by 10x")
        return {k: raw[k] / 10 if raw.get(k) is not None else None for k in keys}

    result = dict(raw)
    for k in keys:
        v = result.get(k)
        if v is not None and v > _PER_100G_MAX[k]:
            logger.warning(f"[NutritionSearch] {k}={v} exceeds max — setting null")
            result[k] = None
    return result


async def search_nutrition_data(
    product_name: str,
    brand: Optional[str] = None,
    barcode: Optional[str] = None,
) -> Optional[NutritionFacts]:
    if not settings.openai.OPENAI_API_KEY:
        return None

    search_query = " ".join(filter(None, [product_name, brand]))
    logger.debug(f"[NutritionSearch] Searching: '{search_query}' barcode={barcode or 'none'}")

    barcode_hint = f"\nBarcode: {barcode}" if barcode else ""
    user_prompt = (
        f"Find nutrition facts per 100g for:\nProduct: {product_name}\nBrand: {brand or 'unknown'}{barcode_hint}"
    )

    try:
        client = AsyncOpenAI(api_key=settings.openai.OPENAI_API_KEY)
        response = await client.responses.create(
            model=settings.openai.OPENAI_MODEL or "o4-mini",
            tools=[{"type": "web_search_preview"}],
            input=[
                {"role": "system", "content": _SEARCH_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "nutrition_search",
                    "schema": _SCHEMA,
                    "strict": True,
                }
            },
        )
        result = json.loads(response.output_text)

        if not result.get("found") or not result.get("nutrition"):
            logger.debug("[NutritionSearch] Not found")
            return None

        raw = result["nutrition"]
        sane = _sanitize_nutrition(raw)

        calories = sane.get("energy_kcal_100g")
        facts: NutritionFacts = {
            "calories": round(calories) if calories is not None else None,
            "protein": _round1(sane.get("proteins_100g")),
            "fat": _round1(sane.get("fat_100g")),
            "saturatedFat": _round1(sane.get("saturated_fat_100g")),
            "carbs": _round1(sane.get("carbohydrates_100g")),
            "sugars": _round1(sane.get("sugars_100g")),
            "fiber": _round1(sane.get("fiber_100g")),
            "salt": _round1(sane.get("salt_100g")),
            "sodium": _round1(sane.get("sodium_100g")),
        }

        has_data = facts["calories"] is not None and any(
            facts[k] is not None
            for k in ("protein", "fat", "carbs")  # type: ignore[literal-required]
        )
        if not has_data:
            logger.debug("[NutritionSearch] Incomplete data, discarding")
            return None

        logger.info(
            f"[NutritionSearch] Found source='{result.get('source')}' "
            f"cal={facts['calories']} prot={facts['protein']} fat={facts['fat']} carbs={facts['carbs']}"
        )
        return facts

    except Exception as exc:
        logger.error(f"[NutritionSearch] Failed: {exc}")
        return None
