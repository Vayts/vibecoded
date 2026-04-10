from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUserDep, OptionalCurrentUserDep, UnitOfWorkDep
from app.core.exc.base import ObjectNotFoundException
from app.schemas.scanner import (
    BarcodeLookupRequest,
    CompareProductsRequest,
    PhotoOcrRequest,
    PhotoScanRequest,
    ProductLookupRequest,
)
from app.services.analysis_jobs import get_analysis_job
from app.services.scanner_service import compare_products, lookup_product, scan_barcode

router = APIRouter(prefix="/scanner", tags=["scanner"])

_MAX_PHOTO_BASE64_SIZE = 10 * 1024 * 1024  # ~10MB


@router.post("/barcode")
async def scan_barcode_endpoint(
    body: BarcodeLookupRequest,
    uow: UnitOfWorkDep,
    current_user: OptionalCurrentUserDep,
) -> dict:
    user_id = str(current_user.id) if current_user else None
    return await scan_barcode(uow, body.barcode, user_id)


@router.get("/personal-analysis/{job_id}")
async def get_personal_analysis(job_id: str) -> dict:
    job = get_analysis_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Analysis job not found")
    return job


@router.post("/lookup")
async def lookup_product_endpoint(body: ProductLookupRequest, uow: UnitOfWorkDep) -> dict:
    try:
        return await lookup_product(uow, body.barcode)
    except ObjectNotFoundException as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/compare")
async def compare_products_endpoint(
    body: CompareProductsRequest,
    uow: UnitOfWorkDep,
    current_user: CurrentUserDep,
) -> dict:
    try:
        return await compare_products(uow, body.barcode1, body.barcode2, current_user)
    except ObjectNotFoundException as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/photo/ocr")
async def photo_ocr(body: PhotoOcrRequest, current_user: CurrentUserDep) -> dict:
    from app.services.photo_identification import PhotoIdentificationError, extract_text_from_photo

    if len(body.imageBase64) > _MAX_PHOTO_BASE64_SIZE:
        raise HTTPException(status_code=400, detail="Image too large")

    try:
        ocr = await extract_text_from_photo(body.imageBase64)
    except PhotoIdentificationError as exc:
        raise HTTPException(status_code=422, detail=exc.args[0]) from exc

    if not ocr:
        raise HTTPException(status_code=422, detail="Could not read text from photo")

    if not ocr.get("isFoodProduct"):
        raise HTTPException(status_code=422, detail="Product does not appear to be a food item")

    return ocr


@router.post("/photo")
async def photo_scan(
    body: PhotoScanRequest,
    uow: UnitOfWorkDep,
    current_user: CurrentUserDep,
) -> dict:
    from app.services.photo_identification import PhotoIdentificationError, identify_product_by_photo

    if len(body.imageBase64) > _MAX_PHOTO_BASE64_SIZE:
        raise HTTPException(status_code=400, detail="Image too large")

    user_id = str(current_user.id)

    try:
        identification = await identify_product_by_photo(body.imageBase64, body.ocr)
    except PhotoIdentificationError as exc:
        raise HTTPException(status_code=422, detail=exc.args[0]) from exc

    if not identification:
        raise HTTPException(status_code=404, detail="Could not identify product from photo")

    product = identification["product"]

    async with uow:
        from app.services.scanner_service import (
            _is_food_product,
            _save_product,
            _build_barcode_response,
            _check_favourite,
        )

        if not _is_food_product(product):
            raise HTTPException(status_code=422, detail="This product does not appear to be a food item")

        photo_image_path = identification.get("photoImagePath")

        if identification.get("shouldUploadPhoto"):
            try:
                import base64
                from app.services.storage import upload_product_image

                raw_bytes = base64.b64decode(body.imageBase64)
                photo_image_path = await upload_product_image(raw_bytes)
                if photo_image_path:
                    product = {
                        **product,
                        "image_url": photo_image_path,
                        "images": {**product.get("images", {}), "front_url": photo_image_path},
                    }
            except Exception as exc:
                raise HTTPException(status_code=502, detail="Failed to store product image") from exc

        await _save_product(uow, product)

        response = await _build_barcode_response(
            uow,
            product.get("code") or product.get("barcode"),
            "photo",
            product,
            user_id,
            scan_source="photo",
            photo_image_path=photo_image_path,
        )

        is_fav = await _check_favourite(uow, user_id, response["barcode"])
        db_prod = await uow.products.get_one_or_none(barcode=response["barcode"])

    return {
        **response,
        "isFavourite": is_fav,
        "productId": str(db_prod.id) if db_prod else None,
        "photoImagePath": photo_image_path,
    }
