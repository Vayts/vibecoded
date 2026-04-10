"""OpenFoodFacts client with 6s timeout and 24h miss cache."""

import asyncio
import time
from typing import Optional

import httpx
from loguru import logger

from app.domain.product_normalization.normalize_openfoodfacts import normalize_openfoodfacts_product

_OFF_BASE_URL = "https://world.openfoodfacts.org/api/v2/product"
_OFF_TIMEOUT_S = 6.0
_MISS_CACHE_TTL_S = 24 * 3600
_MISS_CACHE_MAX = 10_000

_miss_cache: dict[str, float] = {}


class OpenFoodFactsError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def _is_cached_miss(barcode: str) -> bool:
    ts = _miss_cache.get(barcode)
    if ts is None:
        return False
    if time.monotonic() - ts > _MISS_CACHE_TTL_S:
        _miss_cache.pop(barcode, None)
        return False
    return True


def _record_miss(barcode: str) -> None:
    if len(_miss_cache) >= _MISS_CACHE_MAX:
        oldest = next(iter(_miss_cache))
        _miss_cache.pop(oldest, None)
    _miss_cache[barcode] = time.monotonic()


async def lookup_barcode(barcode: str) -> Optional[dict]:
    """Fetch product from OpenFoodFacts. Returns NormalizedProduct dict or None."""
    if _is_cached_miss(barcode):
        logger.debug(f"[OFF] miss-cache hit barcode={barcode}")
        return None

    url = f"{_OFF_BASE_URL}/{barcode}"

    try:
        async with httpx.AsyncClient(timeout=_OFF_TIMEOUT_S) as client:
            resp = await client.get(url)
    except asyncio.TimeoutError:
        logger.warning(f"[OFF] timeout ({_OFF_TIMEOUT_S}s) barcode={barcode}")
        return None
    except httpx.TimeoutException:
        logger.warning(f"[OFF] timeout ({_OFF_TIMEOUT_S}s) barcode={barcode}")
        return None
    except httpx.HTTPError as exc:
        raise OpenFoodFactsError("UPSTREAM_ERROR", f"HTTP error: {exc}") from exc

    if resp.status_code != 200:
        raise OpenFoodFactsError("UPSTREAM_ERROR", f"OFF returned {resp.status_code}")

    data = resp.json()
    if data.get("status") != 1 or not data.get("product"):
        _record_miss(barcode)
        return None

    return normalize_openfoodfacts_product(barcode, data["product"])
