from pydantic import BaseModel, Field


class BarcodeLookupRequest(BaseModel):
    barcode: str = Field(..., min_length=1, max_length=30)


class ProductLookupRequest(BaseModel):
    barcode: str = Field(..., min_length=1, max_length=30)


class CompareProductsRequest(BaseModel):
    barcode1: str = Field(..., min_length=1, max_length=30)
    barcode2: str = Field(..., min_length=1, max_length=30)


class PhotoOcrRequest(BaseModel):
    imageBase64: str


class PhotoScanRequest(BaseModel):
    imageBase64: str
    ocr: dict | None = None
