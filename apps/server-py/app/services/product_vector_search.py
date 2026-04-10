"""Vector similarity search for photo product identification."""

from typing import Optional

from loguru import logger

from app.core.config import settings


async def find_best_vector_match(
    product_name: str,
    brand: Optional[str] = None,
) -> Optional[dict]:
    """Find closest product in DB using embedding similarity.

    Returns dict with 'product' and 'similarity' keys, or None.
    """
    if not settings.openai.OPENAI_API_KEY:
        return None

    query_text = " ".join(filter(None, [product_name, brand]))

    try:
        from openai import AsyncOpenAI
        from app.utils.unitofwork import UnitOfWork

        client = AsyncOpenAI(api_key=settings.openai.OPENAI_API_KEY)
        response = await client.embeddings.create(
            input=query_text,
            model=settings.openai.OPENAI_EMBEDDING_MODEL or "text-embedding-3-small",
        )
        embedding = response.data[0].embedding

        async with UnitOfWork() as uow:
            matches = await uow.products.find_similar(embedding, limit=1)

        if not matches:
            return None

        db_product = matches[0]

        # Build NormalizedProduct dict from DB model
        from app.services.scanner_service import _model_to_dict

        product = _model_to_dict(db_product)

        return {"product": product, "similarity": 0.9, "queryText": query_text}

    except Exception as exc:
        logger.warning(f"[VectorSearch] failed: {exc}")
        return None
