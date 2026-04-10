"""AI-powered product classification using OpenAI structured output."""

from typing import Optional

from loguru import logger
from openai import AsyncOpenAI

from app.core.config import settings
from app.domain.product_facts.build_product_facts import build_classification_from_data
from app.domain.product_facts.prompts import PRODUCT_FACTS_SYSTEM_PROMPT, build_product_facts_prompt
from app.domain.product_facts.schema import AiClassification, NormalizedProduct

_AI_MODEL = "o4-mini"
_SCHEMA = {
    "type": "object",
    "properties": {
        "productType": {
            "type": ["string", "null"],
            "enum": [
                "beverage",
                "dairy",
                "yogurt",
                "cheese",
                "meat",
                "fish",
                "snack",
                "sweet",
                "cereal",
                "sauce",
                "bread",
                "ready_meal",
                "plant_protein",
                "dessert",
                "fruit_vegetable",
                "other",
                None,
            ],
        },
        "dietCompatibility": {
            "type": "object",
            "properties": {
                "vegan": {"type": "string", "enum": ["compatible", "incompatible", "unclear"]},
                "vegetarian": {"type": "string", "enum": ["compatible", "incompatible", "unclear"]},
                "halal": {"type": "string", "enum": ["compatible", "incompatible", "unclear"]},
                "kosher": {"type": "string", "enum": ["compatible", "incompatible", "unclear"]},
                "glutenFree": {"type": "string", "enum": ["compatible", "incompatible", "unclear"]},
                "dairyFree": {"type": "string", "enum": ["compatible", "incompatible", "unclear"]},
                "nutFree": {"type": "string", "enum": ["compatible", "incompatible", "unclear"]},
            },
            "required": ["vegan", "vegetarian", "halal", "kosher", "glutenFree", "dairyFree", "nutFree"],
        },
        "dietCompatibilityReasons": {
            "type": "object",
            "properties": {
                "vegan": {"type": ["string", "null"]},
                "vegetarian": {"type": ["string", "null"]},
                "halal": {"type": ["string", "null"]},
                "kosher": {"type": ["string", "null"]},
                "glutenFree": {"type": ["string", "null"]},
                "dairyFree": {"type": ["string", "null"]},
                "nutFree": {"type": ["string", "null"]},
            },
        },
        "nutriGrade": {
            "type": ["string", "null"],
            "enum": ["a", "b", "c", "d", "e", None],
        },
    },
    "required": ["productType", "dietCompatibility", "dietCompatibilityReasons", "nutriGrade"],
    "additionalProperties": False,
}


async def extract_classification(product: NormalizedProduct) -> AiClassification:
    """Extract AI classification. Falls back to deterministic if OpenAI is unavailable."""
    if not settings.openai.OPENAI_API_KEY:
        logger.debug("[ProductFacts] No API key, using deterministic fallback")
        return build_classification_from_data(product)

    try:
        client = AsyncOpenAI(api_key=settings.openai.OPENAI_API_KEY)
        user_message = build_product_facts_prompt(product)

        response = await client.responses.create(
            model=settings.openai.OPENAI_MODEL or _AI_MODEL,
            input=[
                {"role": "system", "content": PRODUCT_FACTS_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "product_facts",
                    "schema": _SCHEMA,
                    "strict": True,
                }
            },
        )

        import json

        result = json.loads(response.output_text)
        return result  # type: ignore[return-value]

    except Exception as exc:
        logger.warning(f"[ProductFacts] AI extraction failed: {exc}, using deterministic fallback")
        return build_classification_from_data(product)


_cached_service: Optional["ProductFactsAiService"] = None


class ProductFactsAiService:
    async def extract_classification(self, product: NormalizedProduct) -> AiClassification:
        return await extract_classification(product)


def get_product_facts_service() -> ProductFactsAiService:
    global _cached_service
    if _cached_service is None:
        _cached_service = ProductFactsAiService()
    return _cached_service
