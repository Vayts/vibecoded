"""In-memory async analysis job manager.

Each job runs the full product analysis pipeline in the background:
  1. Build user profiles from DB
  2. AI classification (productType, dietCompatibility, nutriGrade)
  3. Nutrition websearch if missing
  4. Ingredient analysis per profile (parallel)
  5. Score engine → per-profile scores
"""

import asyncio
from typing import Optional
from uuid import uuid4

from loguru import logger

from app.domain.product_facts.build_product_facts import (
    build_classification_from_data,
    build_product_facts,
    has_nutrition_data,
)
from app.domain.product_facts.nutrition_utils import build_nutrition_facts
from app.domain.product_facts.schema import (
    IngredientAnalysis,
    NormalizedProduct,
    OnboardingProfile,
    ProductAnalysisResult,
)
from app.domain.score_engine.compute_score import compute_all_profile_scores
from app.services.ingredient_analysis_ai import analyze_ingredients
from app.services.nutrition_websearch import search_nutrition_data
from app.services.product_facts_ai import get_product_facts_service

_JOB_TTL_S = 10 * 60

_jobs: dict[str, dict] = {}


def _default_profile() -> OnboardingProfile:
    return {
        "profileId": "you",
        "profileType": "self",
        "name": "You",
        "mainGoal": None,
        "restrictions": [],
        "allergies": [],
        "otherAllergiesText": None,
        "nutritionPriorities": [],
        "onboardingCompleted": False,
    }


async def _build_profiles(user_id: Optional[str]) -> list[OnboardingProfile]:
    """Load user + family profiles from DB. Falls back to a single anonymous profile."""
    if not user_id:
        return [_default_profile()]

    try:
        from app.utils.unitofwork import UnitOfWork

        async with UnitOfWork() as uow:
            user = await uow.users.get_one_or_none(id=user_id)
            if user is None:
                return [_default_profile()]

            profile = await uow.user_profiles.get_one_or_none(user_id=user_id)
            family_members = await uow.family_members.get_multi(offset=0, limit=50, user_id=user_id)

        profiles: list[OnboardingProfile] = []

        # Self profile
        if profile:
            profiles.append(
                {
                    "profileId": user_id,
                    "profileType": "self",
                    "name": user.name or "You",
                    "mainGoal": profile.main_goal,
                    "restrictions": list(profile.restrictions or []),
                    "allergies": list(profile.allergies or []),
                    "otherAllergiesText": profile.other_allergies_text,
                    "nutritionPriorities": list(profile.nutrition_priorities or []),
                    "onboardingCompleted": profile.onboarding_completed,
                }
            )
        else:
            self_profile = _default_profile()
            self_profile["name"] = user.name or "You"
            self_profile["profileId"] = user_id
            profiles.append(self_profile)

        # Family member profiles
        for member in family_members:
            profiles.append(
                {
                    "profileId": str(member.id),
                    "profileType": "family_member",
                    "name": member.name or "Family member",
                    "mainGoal": getattr(member, "main_goal", None),
                    "restrictions": list(getattr(member, "restrictions", None) or []),
                    "allergies": list(getattr(member, "allergies", None) or []),
                    "otherAllergiesText": getattr(member, "other_allergies_text", None),
                    "nutritionPriorities": list(getattr(member, "nutrition_priorities", None) or []),
                    "onboardingCompleted": True,
                }
            )

        return profiles if profiles else [_default_profile()]

    except Exception as exc:
        logger.warning(f"[Jobs] Failed to load profiles for {user_id}: {exc}")
        return [_default_profile()]


async def _run_job(
    job_id: str,
    product: NormalizedProduct,
    user_id: Optional[str] = None,
    scan_id: Optional[str] = None,
) -> None:
    product_name = product.get("product_name") or product.get("code") or "unknown"
    logger.info(f"[Job:{job_id}] ▶ START product='{product_name}' user={user_id or 'anon'}")

    try:
        # Step 1: Build profiles
        profiles = await _build_profiles(user_id)
        logger.debug(f"[Job:{job_id}] profiles: {[p['name'] for p in profiles]}")

        product_has_nutrition = has_nutrition_data(product)
        logger.debug(f"[Job:{job_id}] has nutrition: {product_has_nutrition}")

        # Step 2: AI classification + nutrition search + ingredient analysis (all parallel)
        ingredient_promises = [
            asyncio.create_task(_safe_analyze_ingredients(product, profile, job_id)) for profile in profiles
        ]

        if product_has_nutrition:
            nutrition_facts = build_nutrition_facts(product)
            classification_result, *ing_results = await asyncio.gather(
                _safe_extract_classification(product, job_id),
                *ingredient_promises,
            )
        else:
            classification_result, web_nutrition, *ing_results = await asyncio.gather(
                _safe_extract_classification(product, job_id),
                search_nutrition_data(
                    product_name,
                    product.get("brands"),
                    product.get("code"),
                ),
                *ingredient_promises,
            )
            nutrition_facts = web_nutrition or build_nutrition_facts(product)
            if web_nutrition:
                logger.info(f"[Job:{job_id}] nutrition found via web search")
            else:
                logger.warning(f"[Job:{job_id}] no nutrition found anywhere — scoring with empty data")

        per_profile_ingredients: dict[str, Optional[IngredientAnalysis]] = {
            profiles[i]["profileId"]: ing_results[i] for i in range(len(profiles))
        }

        # Step 3: Build ProductFacts
        facts = build_product_facts(classification_result, nutrition_facts)

        # Step 4: Compute scores
        profile_scores = compute_all_profile_scores(facts, profiles, per_profile_ingredients)

        for ps in profile_scores:
            logger.info(
                f"[Job:{job_id}] '{ps['name']}' → score={ps['score']} ({ps['fitLabel']}) "
                f"+{len(ps['positives'])}✓ -{len(ps['negatives'])}✗"
            )

        # Step 5: Build result
        self_profile = next((p for p in profiles if p["profileType"] == "self"), None)
        self_ingredients = per_profile_ingredients.get(self_profile["profileId"]) if self_profile else None

        result: ProductAnalysisResult = {
            "productFacts": facts,
            "profiles": profile_scores,
        }
        if self_ingredients:
            result["ingredientAnalysis"] = self_ingredients

        # Update job
        job = _jobs.get(job_id)
        if job:
            job["status"] = "completed"
            job["result"] = result

        # Persist to DB
        if scan_id:
            await _persist_scan_result(scan_id, "completed", result)

        logger.info(f"[Job:{job_id}] ✓ done")

    except Exception as exc:
        logger.error(f"[Job:{job_id}] failed: {exc}")
        job = _jobs.get(job_id)
        if job:
            job["status"] = "failed"
        if scan_id:
            await _persist_scan_result(scan_id, "failed", None)


async def _safe_extract_classification(product: NormalizedProduct, job_id: str):
    try:
        return await get_product_facts_service().extract_classification(product)
    except Exception as exc:
        logger.warning(f"[Job:{job_id}] AI classification failed: {exc}")
        return build_classification_from_data(product)


async def _safe_analyze_ingredients(
    product: NormalizedProduct, profile: OnboardingProfile, job_id: str
) -> Optional[IngredientAnalysis]:
    try:
        return await analyze_ingredients(product, profile)
    except Exception as exc:
        logger.warning(f"[Job:{job_id}] ingredient analysis failed for '{profile['name']}': {exc}")
        return None


async def _persist_scan_result(scan_id: str, status: str, result) -> None:
    try:
        from app.utils.unitofwork import UnitOfWork

        update_data = {
            "personal_analysis_status": status,
            "personal_analysis_job_id": None,
        }
        if result:
            update_data["multi_profile_result"] = result

        async with UnitOfWork() as uow:
            await uow.scans.update(update_data, return_object=False, id=scan_id)

    except Exception as exc:
        logger.warning(f"[Jobs] Failed to persist scan result {scan_id}: {exc}")


def _schedule_cleanup(job_id: str) -> None:
    async def _cleanup():
        await asyncio.sleep(_JOB_TTL_S)
        _jobs.pop(job_id, None)

    asyncio.create_task(_cleanup())


def create_analysis_job(
    product: NormalizedProduct,
    user_id: Optional[str] = None,
    scan_id: Optional[str] = None,
) -> dict:
    job_id = str(uuid4())
    job = {"jobId": job_id, "status": "pending"}
    _jobs[job_id] = job
    _schedule_cleanup(job_id)
    asyncio.create_task(_run_job(job_id, product, user_id, scan_id))
    return {"jobId": job_id, "status": "pending"}


def create_cached_analysis_job(cached_result: dict) -> dict:
    job_id = str(uuid4())
    _jobs[job_id] = {"jobId": job_id, "status": "completed", "result": cached_result}
    _schedule_cleanup(job_id)
    return {"jobId": job_id, "status": "completed"}


def get_analysis_job(job_id: str) -> Optional[dict]:
    return _jobs.get(job_id)
