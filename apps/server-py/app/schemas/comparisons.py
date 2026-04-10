from typing import Any, Optional

from pydantic import BaseModel


class ComparisonProductSummary(BaseModel):
    id: str
    barcode: str
    product_name: Optional[str]
    brands: Optional[str]
    image_url: Optional[str]

    model_config = {"from_attributes": True}


class ComparisonHistoryItem(BaseModel):
    id: str
    createdAt: str
    product1: Optional[ComparisonProductSummary]
    product2: Optional[ComparisonProductSummary]


class ComparisonHistoryResponse(BaseModel):
    items: list[ComparisonHistoryItem]
    nextCursor: Optional[str]


class ComparisonDetailResponse(BaseModel):
    id: str
    createdAt: str
    comparisonResult: Optional[Any]
