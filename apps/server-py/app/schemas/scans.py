from typing import Any, Optional

from pydantic import BaseModel

from app.enums import PersonalAnalysisStatus, ScanSource, ScanType


class ProductSummary(BaseModel):
    id: str
    barcode: Optional[str]
    product_name: Optional[str]
    brands: Optional[str]
    image_url: Optional[str]
    nutriscore_grade: Optional[str]

    model_config = {"from_attributes": True}


class ProfileChip(BaseModel):
    profileId: str
    name: str
    score: Optional[int]
    fitLabel: Optional[str]


class ScanHistoryItem(BaseModel):
    id: str
    type: ScanType
    createdAt: str
    source: ScanSource
    overallScore: Optional[int]
    overallRating: Optional[str]
    personalScore: Optional[int]
    personalRating: Optional[str]
    personalAnalysisStatus: Optional[PersonalAnalysisStatus]
    isFavourite: bool
    profileChips: Optional[list[ProfileChip]]
    product: Optional[ProductSummary]
    product2: Optional[ProductSummary]


class ScanHistoryResponse(BaseModel):
    items: list[ScanHistoryItem]
    nextCursor: Optional[str]


class ScanDetailResponse(BaseModel):
    id: str
    type: ScanType
    analysisId: Optional[str]
    createdAt: str
    source: ScanSource
    overallScore: Optional[int]
    overallRating: Optional[str]
    personalAnalysisStatus: Optional[PersonalAnalysisStatus]
    barcode: Optional[str]
    productId: Optional[str]
    isFavourite: bool
    product: Optional[Any]
    analysisResult: Optional[Any]
    comparisonResult: Optional[Any]
