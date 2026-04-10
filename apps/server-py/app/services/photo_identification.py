"""Photo-based product identification: OCR → vector + websearch (parallel)."""

import json
from typing import Optional

from loguru import logger
from openai import AsyncOpenAI

from app.core.config import settings
from app.domain.product_facts.build_product_facts import has_nutrition_data
from app.domain.product_facts.schema import NormalizedProduct

_OCR_SYSTEM_PROMPT = """You are an OCR specialist. Given a photo, extract ALL visible text EXACTLY as it appears on the packaging. Do NOT translate anything.

RULES:
- Transcribe every piece of text you can see: product name, brand, ingredients, nutrition facts, weight, etc.
- Preserve the ORIGINAL language exactly as printed. Do NOT translate to English or any other language.
- Identify the most likely product name and brand from the text (in the original language as printed).
- Determine whether this is a human food/beverage product.
- Do NOT guess or invent text that isn't visible in the image.
- Be thorough: even small/blurry text matters for product identification.

FOOD CLASSIFICATION:
- Set isFoodProduct=true ONLY when the photo clearly shows a human food or beverage product.
- Set isFoodProduct=false for non-food items such as cosmetics, personal care, household cleaners, medicine, supplements, pet food, toys, electronics, utensils, menus, receipts, shelves, or general objects.
- If the image is ambiguous or you are not confident it is human food/drink, return isFoodProduct=false."""

_OCR_SCHEMA = {
    "type": "object",
    "properties": {
        "allText": {"type": "string"},
        "productName": {"type": ["string", "null"]},
        "brand": {"type": ["string", "null"]},
        "isFoodProduct": {"type": "boolean"},
    },
    "required": ["allText", "productName", "brand", "isFoodProduct"],
    "additionalProperties": False,
}

_SEARCH_SYSTEM_PROMPT = """You are a food product identification assistant. You are given text extracted from a product photo via OCR.
Your job is to identify the exact product AND find its complete nutritional information using web search.

YOU MUST PERFORM MULTIPLE WEB SEARCHES to find: product identity, nutrition facts per 100g, and ingredients.

RULES:
- All output fields (brand, ingredients, etc.) MUST be in English. Translate if needed.
- product_name MUST contain ONLY the short product name WITHOUT the brand.
- Ingredients should be a clean array of individual ingredient names (in English).
- Round all nutrition values to 1 decimal place. energy_kcal_100g to nearest integer.
- ALL values MUST be per 100g. Convert from per-serving if needed.
- If a nutrition value is not available, set to null. NEVER use 0 as placeholder.
- If no reliable result is found, return found: false.
- Set confidence 0.0-1.0. Below 0.5 = found: false."""

_SEARCH_SCHEMA = {
    "type": "object",
    "properties": {
        "found": {"type": "boolean"},
        "confidence": {"type": "number"},
        "product": {
            "type": ["object", "null"],
            "properties": {
                "code": {"type": "string"},
                "product_name": {"type": ["string", "null"]},
                "brands": {"type": ["string", "null"]},
                "image_url": {"type": ["string", "null"]},
                "ingredients_text": {"type": ["string", "null"]},
                "nutriscore_grade": {"type": ["string", "null"]},
                "categories": {"type": ["string", "null"]},
                "quantity": {"type": ["string", "null"]},
                "serving_size": {"type": ["string", "null"]},
                "ingredients": {"type": "array", "items": {"type": "string"}},
                "allergens": {"type": "array", "items": {"type": "string"}},
                "additives": {"type": "array", "items": {"type": "string"}},
                "additives_count": {"type": ["number", "null"]},
                "traces": {"type": "array", "items": {"type": "string"}},
                "countries": {"type": "array", "items": {"type": "string"}},
                "category_tags": {"type": "array", "items": {"type": "string"}},
                "images": {
                    "type": "object",
                    "properties": {
                        "front_url": {"type": ["string", "null"]},
                        "ingredients_url": {"type": ["string", "null"]},
                        "nutrition_url": {"type": ["string", "null"]},
                    },
                },
                "nutrition": {
                    "type": "object",
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
                "scores": {
                    "type": "object",
                    "properties": {
                        "nutriscore_grade": {"type": ["string", "null"]},
                        "nutriscore_score": {"type": ["number", "null"]},
                        "ecoscore_grade": {"type": ["string", "null"]},
                        "ecoscore_score": {"type": ["number", "null"]},
                    },
                },
            },
        },
    },
    "required": ["found", "confidence", "product"],
    "additionalProperties": False,
}

_MIN_CONFIDENCE = 0.5


class PhotoIdentificationError(Exception):
    pass


def _has_valid_image(product: dict) -> bool:
    url = product.get("image_url") or ""
    lower = url.strip().lower()
    return bool(lower) and lower not in {"/null", "null", "n/a"}


def _round1(v) -> Optional[float]:
    return round(v * 10) / 10 if v is not None else None


async def extract_text_from_photo(image_base64: str) -> Optional[dict]:
    if not settings.openai.OPENAI_API_KEY:
        return None

    client = AsyncOpenAI(api_key=settings.openai.OPENAI_API_KEY)
    try:
        response = await client.responses.create(
            model="gpt-4o",
            input=[
                {"role": "system", "content": _OCR_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": "Extract all visible text from this product photo."},
                        {"type": "input_image", "image_url": f"data:image/jpeg;base64,{image_base64}"},
                    ],
                },
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "photo_ocr",
                    "schema": _OCR_SCHEMA,
                    "strict": True,
                }
            },
        )
        return json.loads(response.output_text)
    except Exception as exc:
        logger.error(f"[PhotoID] OCR failed: {exc}")
        return None


async def _search_by_extracted_text(ocr: dict) -> Optional[dict]:
    if not settings.openai.OPENAI_API_KEY:
        return None

    search_query = (
        " ".join(filter(None, [ocr.get("brand"), ocr.get("productName")])) or (ocr.get("allText") or "")[:300]
    )

    client = AsyncOpenAI(api_key=settings.openai.OPENAI_API_KEY)
    try:
        response = await client.responses.create(
            model=settings.openai.OPENAI_MODEL or "o4-mini",
            tools=[{"type": "web_search_preview"}],
            input=[
                {"role": "system", "content": _SEARCH_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Find the food product matching this text extracted from a product photo.\n\n"
                        f"DETECTED PRODUCT NAME: {ocr.get('productName') or 'unknown'}\n"
                        f"DETECTED BRAND: {ocr.get('brand') or 'unknown'}\n\n"
                        f'Search for: "{search_query}"'
                    ),
                },
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "text_product_search",
                    "schema": _SEARCH_SCHEMA,
                    "strict": True,
                }
            },
        )

        result = json.loads(response.output_text)
        found, confidence, product = result.get("found"), result.get("confidence", 0), result.get("product")

        logger.debug(f"[PhotoID:search] found={found} confidence={confidence}")

        if not found or confidence < _MIN_CONFIDENCE or not product:
            return None

        from uuid import uuid4

        code = product.get("code") or f"photo-{str(uuid4())[:12]}"

        n = product.get("nutrition") or {}
        normalized_nutrition = {
            "energy_kcal_100g": round(n.get("energy_kcal_100g")) if n.get("energy_kcal_100g") is not None else None,
            "proteins_100g": _round1(n.get("proteins_100g")),
            "fat_100g": _round1(n.get("fat_100g")),
            "saturated_fat_100g": _round1(n.get("saturated_fat_100g")),
            "carbohydrates_100g": _round1(n.get("carbohydrates_100g")),
            "sugars_100g": _round1(n.get("sugars_100g")),
            "fiber_100g": _round1(n.get("fiber_100g")),
            "salt_100g": _round1(n.get("salt_100g")),
            "sodium_100g": _round1(n.get("sodium_100g")),
        }

        normalized: NormalizedProduct = {
            "code": code,
            "product_name": product.get("product_name"),
            "brands": product.get("brands"),
            "image_url": product.get("image_url"),
            "ingredients_text": product.get("ingredients_text"),
            "nutriscore_grade": product.get("nutriscore_grade"),
            "categories": product.get("categories"),
            "quantity": product.get("quantity"),
            "serving_size": product.get("serving_size"),
            "ingredients": product.get("ingredients") or [],
            "allergens": product.get("allergens") or [],
            "additives": product.get("additives") or [],
            "additives_count": product.get("additives_count"),
            "traces": product.get("traces") or [],
            "countries": product.get("countries") or [],
            "category_tags": product.get("category_tags") or [],
            "images": product.get("images") or {},
            "nutrition": normalized_nutrition,
            "scores": product.get("scores") or {},
        }

        # Reject products without meaningful nutrition data
        if not has_nutrition_data(normalized):
            logger.debug("[PhotoID:search] product found but no nutrition data — treating as not found")
            return None

        return normalized

    except Exception as exc:
        logger.warning(f"[PhotoID:search] failed: {exc}")
        return None


async def identify_product_by_photo(
    image_base64: str,
    precomputed_ocr: Optional[dict] = None,
) -> Optional[dict]:
    """Two-step identification: OCR → parallel vector + websearch."""
    if not settings.openai.OPENAI_API_KEY:
        return None

    # Step 1: OCR
    ocr = precomputed_ocr or await extract_text_from_photo(image_base64)

    if not ocr:
        logger.debug("[PhotoID] OCR returned None")
        return None

    if not ocr.get("isFoodProduct"):
        raise PhotoIdentificationError("NOT_FOOD")

    # Step 2: Vector + websearch in parallel
    import asyncio

    async def vector_search():
        if not ocr.get("productName"):
            return None
        try:
            from app.services.product_vector_search import find_best_vector_match

            return await find_best_vector_match(
                product_name=ocr["productName"],
                brand=ocr.get("brand"),
            )
        except Exception as exc:
            logger.warning(f"[PhotoID] vector branch error: {exc}")
            return None

    async def websearch():
        try:
            return await _search_by_extracted_text(ocr)
        except Exception as exc:
            logger.warning(f"[PhotoID] websearch branch error: {exc}")
            return None

    vector_result, websearch_result = await asyncio.gather(
        vector_search(),
        websearch(),
    )

    # Priority 1: vector match with nutrition
    if vector_result and has_nutrition_data(vector_result["product"]):
        product = vector_result["product"]
        return {
            "product": product,
            "shouldUploadPhoto": not _has_valid_image(product),
            "source": "vector",
        }

    # Priority 2: websearch result
    if websearch_result:
        return {
            "product": websearch_result,
            "shouldUploadPhoto": True,
            "source": "websearch",
        }

    logger.debug("[PhotoID] All lookup strategies failed")
    return None
