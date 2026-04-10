from typing import Optional

from pydantic import BaseModel

from app.enums import PersonalAnalysisStatus, ScanSource
from app.schemas.scans import ProfileChip, ProductSummary


class FavouriteItem(BaseModel):
    favouriteId: str
    id: str
    type: str
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


class FavouriteListResponse(BaseModel):
    items: list[FavouriteItem]
    nextCursor: Optional[str]


class AddFavouriteRequest(BaseModel):
    productId: str


class FavouriteStatusResponse(BaseModel):
    isFavourite: bool
