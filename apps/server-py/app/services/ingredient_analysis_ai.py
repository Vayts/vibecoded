"""AI-powered per-ingredient analysis for a user profile."""

from typing import Optional

from loguru import logger
from openai import AsyncOpenAI

from app.core.config import settings
from app.domain.product_facts.schema import IngredientAnalysis, NormalizedProduct, OnboardingProfile

_SYSTEM_PROMPT = """You are a food ingredient analyst. You receive a product's ingredient list and a user's dietary profile.

Your job:
1. Translate ALL ingredients to English
2. Classify each ingredient based on the user's specific restrictions, allergies, and priorities
3. Return structured JSON only

Classification rules:
- "bad" = directly conflicts with user's restrictions or allergies (e.g. pork for halal, milk for dairy-free, gluten for gluten-free)
- "warning" = potentially concerning but not certain (e.g. "natural flavors" when user has allergies — source is unclear)
- "good" = actively beneficial for user's goals/priorities (e.g. high-fiber ingredient when user prioritizes HIGH_FIBER)
- "neutral" = no specific concern or benefit for this user

Important:
- Every ingredient must appear in the output
- Translate names to English even if originally in English
- Keep names short and clear (e.g. "Palm Oil" not "Hydrogenated palm oil (contains soy lecithin)")
- Reason must reference the specific user attribute (restriction, allergy, goal)
- If no user restrictions/allergies, most ingredients will be "neutral"
- For common harmful additives (E-numbers known to be problematic), use "warning"
- Summary should mention only genuinely concerning ingredients for THIS user, or null if no concerns
- Custom allergy entries may contain nonsensical or overly broad text (e.g. "everything", "water", "all food", random words). Ignore any custom allergy that is not a real, specific food allergen or ingredient. Only flag ingredients that match a legitimate, medically recognized or plausible food allergy/sensitivity"""

_SCHEMA = {
    "type": "object",
    "properties": {
        "ingredients": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "status": {"type": "string", "enum": ["good", "neutral", "warning", "bad"]},
                    "reason": {"type": ["string", "null"]},
                },
                "required": ["name", "status", "reason"],
                "additionalProperties": False,
            },
        },
        "summary": {"type": ["string", "null"]},
    },
    "required": ["ingredients", "summary"],
    "additionalProperties": False,
}


def _build_profile_context(profile: OnboardingProfile) -> str:
    parts: list[str] = []
    restrictions = profile.get("restrictions") or []
    if restrictions:
        parts.append(f"Dietary restrictions: {', '.join(restrictions)}")
    allergies = [a for a in (profile.get("allergies") or []) if a != "OTHER"]
    other_text = profile.get("otherAllergiesText")
    if other_text:
        allergies.append(other_text)
    if allergies:
        parts.append(f"Allergies: {', '.join(allergies)}")
    priorities = profile.get("nutritionPriorities") or []
    if priorities:
        parts.append(f"Nutrition priorities: {', '.join(priorities)}")
    goal = profile.get("mainGoal")
    if goal:
        parts.append(f"Goal: {goal}")
    return "\n".join(parts) if parts else "No specific dietary restrictions or preferences."


def _build_ingredients_text(product: NormalizedProduct) -> Optional[str]:
    ingredients_text = product.get("ingredients_text", "")
    if ingredients_text and ingredients_text.strip():
        return ingredients_text.strip()
    ingredients = product.get("ingredients") or []
    if ingredients:
        return ", ".join(ingredients)
    return None


async def analyze_ingredients(
    product: NormalizedProduct,
    profile: OnboardingProfile,
) -> Optional[IngredientAnalysis]:
    ingredients_text = _build_ingredients_text(product)
    if not ingredients_text:
        return None

    if not settings.openai.OPENAI_API_KEY:
        return None

    profile_context = _build_profile_context(profile)
    product_name = product.get("product_name") or "Unknown product"
    brands = product.get("brands") or "Unknown"

    user_prompt = f"""Product: {product_name}
Brand: {brands}

Ingredients: {ingredients_text}

User profile:
{profile_context}"""

    logger.debug(f"[IngredientAnalysis] Starting — {len(product.get('ingredients') or [])} ingredients")

    try:
        client = AsyncOpenAI(api_key=settings.openai.OPENAI_API_KEY)
        response = await client.responses.create(
            model=settings.openai.OPENAI_MODEL or "o4-mini",
            input=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "ingredient_analysis",
                    "schema": _SCHEMA,
                    "strict": True,
                }
            },
        )
        import json

        result: IngredientAnalysis = json.loads(response.output_text)
        logger.debug(f"[IngredientAnalysis] Done — {len(result.get('ingredients', []))} items")
        return result
    except Exception as exc:
        logger.error(f"[IngredientAnalysis] Failed: {exc}")
        return None
