"""Scanner orchestration — barcode lookup, photo identification, compare."""

from datetime import datetime, timezone
from typing import Optional

from loguru import logger

from app.core.exc.base import ObjectNotFoundException
from app.models.user import User
from app.services.analysis_jobs import create_analysis_job, create_cached_analysis_job
from app.services.openfoodfacts import OpenFoodFactsError, lookup_barcode
from app.utils.unitofwork import UnitOfWork

_RESULT_CACHE_SECONDS = 2 * 3600  # 2 hours


def _is_food_product(product: dict) -> bool:
    """Basic food product heuristic — non-food categories are excluded."""
    non_food_keywords = [
        "cosmetic",
        "beauty",
        "shampoo",
        "soap",
        "detergent",
        "cleaner",
        "medicine",
        "drug",
        "pharmaceutical",
        "supplement",
        "pet food",
        "baby formula",
    ]
    combined = " ".join(
        filter(
            None,
            [
                product.get("product_name") or "",
                product.get("categories") or "",
                " ".join(product.get("category_tags") or []),
            ],
        )
    ).lower()

    return not any(kw in combined for kw in non_food_keywords)


async def _save_product(uow: UnitOfWork, product: dict) -> dict:
    """Upsert product to DB. Returns the saved row as dict-compatible object."""
    barcode = product.get("barcode") or product.get("code")
    if not barcode:
        return product

    existing = await uow.products.get_one_or_none(barcode=barcode)
    if existing:
        return product  # use normalized dict, not DB object

    create_data = {
        "barcode": barcode,
        "code": product.get("code") or barcode,
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
        "nutrition": product.get("nutrition") or {},
        "scores": product.get("scores") or {},
    }
    await uow.products.create(create_data)
    return product


async def _build_barcode_response(
    uow: UnitOfWork,
    barcode: str,
    source: str,
    product: dict,
    user_id: Optional[str],
    scan_source: str = "barcode",
    photo_image_path: Optional[str] = None,
) -> dict:
    """Build the scanner response and kick off the analysis job."""
    scan_id: Optional[str] = None

    if user_id:
        # Check for recent scan (2h cache)
        recent_scan = await uow.scans.get_one_or_none(
            user_id=user_id,
            barcode=barcode,
        )
        if recent_scan:
            scan_id = str(recent_scan.id)
            scan_age = (
                datetime.now(timezone.utc) - recent_scan.created_at.replace(tzinfo=timezone.utc)
            ).total_seconds()

            if (
                scan_source != "photo"
                and scan_age < _RESULT_CACHE_SECONDS
                and recent_scan.personal_analysis_status == "completed"
                and recent_scan.multi_profile_result
            ):
                personal_analysis = create_cached_analysis_job(recent_scan.multi_profile_result)
                return {
                    "success": True,
                    "barcode": barcode,
                    "source": source,
                    "product": product,
                    "personalAnalysis": personal_analysis,
                }
        else:
            db_product = await uow.products.get_one_or_none(barcode=barcode)
            product_id = str(db_product.id) if db_product else None
            scan = await uow.scans.create(
                {
                    "user_id": user_id,
                    "product_id": product_id,
                    "barcode": barcode,
                    "source": scan_source,
                    "personal_analysis_status": "pending",
                    "photo_image_path": photo_image_path,
                    "type": "product",
                }
            )
            scan_id = str(scan.id)

    personal_analysis = create_analysis_job(product, user_id, scan_id)
    return {
        "success": True,
        "barcode": barcode,
        "source": source,
        "product": product,
        "personalAnalysis": personal_analysis,
    }


async def scan_barcode(
    uow: UnitOfWork,
    barcode: str,
    user_id: Optional[str],
) -> dict:
    """Main barcode scan flow: OFF → save → analysis."""
    async with uow:
        # Step 1: Check DB cache
        product: Optional[dict] = None
        db_product = await uow.products.get_one_or_none(barcode=barcode)
        if db_product:
            product = _model_to_dict(db_product)

        source = "openfoodfacts"

        # Step 2: OpenFoodFacts
        if product is None:
            try:
                product = await lookup_barcode(barcode)
            except OpenFoodFactsError as exc:
                logger.warning(f"[scanner] OFF error ({exc.code}) barcode={barcode}: {exc}")
                # Fall through to not-found

        # Step 3: Not found
        if not product:
            return {"success": False, "barcode": barcode, "source": source, "error": "PRODUCT_NOT_FOUND"}

        # Step 4: Validate food product
        if not _is_food_product(product):
            return {"success": False, "barcode": barcode, "source": source, "error": "PRODUCT_NOT_FOUND"}

        # Step 5: Persist
        await _save_product(uow, product)

        # Step 6: Build response
        response = await _build_barcode_response(uow, barcode, source, product, user_id)

        if user_id:
            is_fav = await _check_favourite(uow, user_id, barcode)
            db_prod = await uow.products.get_one_or_none(barcode=barcode)
            return {**response, "isFavourite": is_fav, "productId": str(db_prod.id) if db_prod else None}

        db_prod = await uow.products.get_one_or_none(barcode=barcode)
        return {**response, "productId": str(db_prod.id) if db_prod else None}


async def lookup_product(uow: UnitOfWork, barcode: str) -> dict:
    """Lightweight product lookup — no analysis triggered."""
    async with uow:
        db_product = await uow.products.get_one_or_none(barcode=barcode)
        if db_product:
            product = _model_to_dict(db_product)
            return {"success": True, "product": _to_product_preview(product, str(db_product.id))}

        try:
            product = await lookup_barcode(barcode)
        except OpenFoodFactsError as exc:
            raise ObjectNotFoundException(detail=exc.args[0]) from exc

        if not product or not _is_food_product(product):
            raise ObjectNotFoundException(detail="Product not found")

        await _save_product(uow, product)
        db_prod = await uow.products.get_one_or_none(barcode=barcode)
        product_id = str(db_prod.id) if db_prod else barcode

        return {"success": True, "product": _to_product_preview(product, product_id)}


async def compare_products(
    uow: UnitOfWork,
    barcode1: str,
    barcode2: str,
    user: User,
) -> dict:
    """Compare two products across all user profiles using AI."""
    from app.domain.product_facts.build_product_facts import build_classification_from_data, build_product_facts
    from app.domain.product_facts.nutrition_utils import build_nutrition_facts
    from app.domain.score_engine.compute_score import compute_all_profile_scores
    from app.services.analysis_jobs import _build_profiles

    async with uow:
        product1 = await _resolve_product(uow, barcode1)
        product2 = await _resolve_product(uow, barcode2)

        if not product1:
            raise ObjectNotFoundException(detail="First product not found")
        if not product2:
            raise ObjectNotFoundException(detail="Second product not found")

        profiles = await _build_profiles(str(user.id))

        # Simple deterministic comparison (no AI for now — keeps it fast)
        facts1 = build_product_facts(
            build_classification_from_data(product1),
            build_nutrition_facts(product1),
        )
        facts2 = build_product_facts(
            build_classification_from_data(product2),
            build_nutrition_facts(product2),
        )
        scores1 = compute_all_profile_scores(facts1, profiles)
        scores2 = compute_all_profile_scores(facts2, profiles)

        db_p1 = await uow.products.get_one_or_none(barcode=barcode1)
        db_p2 = await uow.products.get_one_or_none(barcode=barcode2)

        # Save comparison to history
        await uow.comparisons.create(
            {
                "user_id": str(user.id),
                "product1_id": str(db_p1.id) if db_p1 else None,
                "product2_id": str(db_p2.id) if db_p2 else None,
                "barcode1": barcode1,
                "barcode2": barcode2,
                "comparison_result": {
                    "profiles1": scores1,
                    "profiles2": scores2,
                },
            }
        )

    return {
        "product1": _to_comparison_preview(product1, str(db_p1.id) if db_p1 else barcode1),
        "product2": _to_comparison_preview(product2, str(db_p2.id) if db_p2 else barcode2),
        "profiles1": scores1,
        "profiles2": scores2,
    }


async def _resolve_product(uow: UnitOfWork, barcode: str) -> Optional[dict]:
    db_product = await uow.products.get_one_or_none(barcode=barcode)
    if db_product:
        return _model_to_dict(db_product)
    try:
        product = await lookup_barcode(barcode)
    except OpenFoodFactsError:
        return None
    if not product or not _is_food_product(product):
        return None
    await _save_product(uow, product)
    return product


async def _check_favourite(uow: UnitOfWork, user_id: str, barcode: str) -> bool:
    db_product = await uow.products.get_one_or_none(barcode=barcode)
    if not db_product:
        return False
    fav = await uow.favorites.get_one_or_none(user_id=user_id, product_id=str(db_product.id))
    return fav is not None


def _model_to_dict(db_product) -> dict:
    return {
        "code": db_product.barcode,
        "barcode": db_product.barcode,
        "product_name": db_product.product_name,
        "brands": db_product.brands,
        "image_url": db_product.image_url,
        "ingredients_text": db_product.ingredients_text,
        "nutriscore_grade": db_product.nutriscore_grade,
        "categories": db_product.categories,
        "quantity": db_product.quantity,
        "serving_size": db_product.serving_size,
        "ingredients": list(db_product.ingredients or []),
        "allergens": list(db_product.allergens or []),
        "additives": list(db_product.additives or []),
        "additives_count": db_product.additives_count,
        "traces": list(db_product.traces or []),
        "countries": list(db_product.countries or []),
        "category_tags": list(db_product.category_tags or []),
        "images": dict(db_product.images or {}),
        "nutrition": dict(db_product.nutrition or {}),
        "scores": dict(db_product.scores or {}),
    }


def _to_product_preview(product: dict, product_id: str) -> dict:
    return {
        "productId": product_id,
        "barcode": product.get("barcode") or product.get("code"),
        "product_name": product.get("product_name"),
        "brands": product.get("brands"),
        "image_url": product.get("image_url"),
    }


def _to_comparison_preview(product: dict, product_id: str) -> dict:
    n = product.get("nutrition") or {}
    scores = product.get("scores") or {}
    return {
        **_to_product_preview(product, product_id),
        "nutrition": {
            "calories": n.get("energy_kcal_100g"),
            "protein": n.get("proteins_100g"),
            "fat": n.get("fat_100g"),
            "sugars": n.get("sugars_100g"),
            "fiber": n.get("fiber_100g"),
            "salt": n.get("salt_100g"),
            "saturatedFat": n.get("saturated_fat_100g"),
            "nutriscore_grade": scores.get("nutriscore_grade"),
        },
    }
