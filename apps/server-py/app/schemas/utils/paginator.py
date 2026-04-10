from typing import Generic, TypeVar

from pydantic import BaseModel, Field, model_validator

M = TypeVar("M")


class PaginatedOutput(BaseModel, Generic[M]):
    count: int = Field(description="Total number of items")
    total_pages: int = Field(description="Total number of pages")
    input_items: list[M] = Field(description="Raw item list (used internally)")


class PaginatedResponse(BaseModel, Generic[M]):
    count: int = Field(description="Total number of items")
    total_pages: int = Field(description="Total number of pages")
    items: list[M] = Field(None, description="Items on the current page")
    input_items: list[M] = Field(description="Raw item list", exclude=True)

    @model_validator(mode="after")
    def fill_items(self) -> "PaginatedResponse[M]":
        self.items = self.input_items
        return self


class PaginationParams(BaseModel):
    page: int = Field(1, ge=1, description="Page number")
    per_page: int = Field(20, ge=1, le=100, description="Items per page")
