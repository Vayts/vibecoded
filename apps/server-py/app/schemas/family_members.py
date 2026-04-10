from typing import Optional

from pydantic import BaseModel, Field

from app.enums import Allergy, MainGoal, NutritionPriority, Restriction


class FamilyMemberResponse(BaseModel):
    id: str
    name: str
    mainGoal: Optional[str]
    restrictions: list[str]
    allergies: list[str]
    otherAllergiesText: Optional[str]
    nutritionPriorities: list[str]
    createdAt: str
    updatedAt: str

    model_config = {"from_attributes": True}


class CreateFamilyMemberRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    mainGoal: Optional[MainGoal] = None
    restrictions: Optional[list[Restriction]] = None
    allergies: Optional[list[Allergy]] = None
    otherAllergiesText: Optional[str] = None
    nutritionPriorities: Optional[list[NutritionPriority]] = None


class UpdateFamilyMemberRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    mainGoal: Optional[MainGoal] = None
    restrictions: Optional[list[Restriction]] = None
    allergies: Optional[list[Allergy]] = None
    otherAllergiesText: Optional[str] = None
    nutritionPriorities: Optional[list[NutritionPriority]] = None
