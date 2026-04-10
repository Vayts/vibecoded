from enum import StrEnum


class BaseStrEnum(StrEnum):
    @classmethod
    def list(cls) -> list[str]:
        return [e.value for e in cls]


class OrderDirection(BaseStrEnum):
    ASC = "asc"
    DESC = "desc"


class DietType(BaseStrEnum):
    NONE = "NONE"
    KETO = "KETO"
    VEGAN = "VEGAN"
    VEGETARIAN = "VEGETARIAN"
    PALEO = "PALEO"
    LOW_CARB = "LOW_CARB"
    GLUTEN_FREE = "GLUTEN_FREE"
    DAIRY_FREE = "DAIRY_FREE"


class MainGoal(BaseStrEnum):
    GENERAL_HEALTH = "GENERAL_HEALTH"
    WEIGHT_LOSS = "WEIGHT_LOSS"
    DIABETES_CONTROL = "DIABETES_CONTROL"
    PREGNANCY = "PREGNANCY"
    MUSCLE_GAIN = "MUSCLE_GAIN"


class Restriction(BaseStrEnum):
    VEGAN = "VEGAN"
    VEGETARIAN = "VEGETARIAN"
    KETO = "KETO"
    PALEO = "PALEO"
    GLUTEN_FREE = "GLUTEN_FREE"
    DAIRY_FREE = "DAIRY_FREE"
    HALAL = "HALAL"
    KOSHER = "KOSHER"
    NUT_FREE = "NUT_FREE"


class Allergy(BaseStrEnum):
    PEANUTS = "PEANUTS"
    TREE_NUTS = "TREE_NUTS"
    GLUTEN = "GLUTEN"
    DAIRY = "DAIRY"
    SOY = "SOY"
    EGGS = "EGGS"
    SHELLFISH = "SHELLFISH"
    SESAME = "SESAME"
    OTHER = "OTHER"


class NutritionPriority(BaseStrEnum):
    HIGH_PROTEIN = "HIGH_PROTEIN"
    LOW_SUGAR = "LOW_SUGAR"
    LOW_SODIUM = "LOW_SODIUM"
    LOW_CARB = "LOW_CARB"
    HIGH_FIBER = "HIGH_FIBER"


class ScanSource(BaseStrEnum):
    barcode = "barcode"
    photo = "photo"


class ScanType(BaseStrEnum):
    product = "product"
    comparison = "comparison"


class PersonalAnalysisStatus(BaseStrEnum):
    pending = "pending"
    completed = "completed"
    failed = "failed"


class AuthProviderEnum(BaseStrEnum):
    email = "email"
    google = "google"
    apple = "apple"
