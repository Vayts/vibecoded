from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.enums import Allergy, DietType, MainGoal, NutritionPriority, Restriction


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    email_verified: bool
    image: Optional[str]
    subscription_status: Optional[str]
    subscription_plan: Optional[str]
    subscription_expiry: Optional[datetime]
    free_generations_balance: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UpdateMeRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    image: Optional[str] = Field(None, max_length=1024)


class UserProfileResponse(BaseModel):
    id: str
    user_id: str
    main_goal: Optional[MainGoal]
    restrictions: list[Restriction]
    allergies: list[Allergy]
    other_allergies_text: Optional[str]
    nutrition_priorities: list[NutritionPriority]
    onboarding_completed: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UpsertProfileRequest(BaseModel):
    main_goal: Optional[MainGoal] = None
    restrictions: Optional[list[Restriction]] = None
    allergies: Optional[list[Allergy]] = None
    other_allergies_text: Optional[str] = None
    nutrition_priorities: Optional[list[NutritionPriority]] = None
    onboarding_completed: Optional[bool] = None


class LegacyDietType(BaseModel):
    diet_type: Optional[DietType] = None
