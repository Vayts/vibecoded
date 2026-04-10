"""Python types mirroring the shared TypeScript product-analysis schemas."""

from typing import Literal, Optional, TypedDict


DietCompatibilityValue = Literal["compatible", "incompatible", "unclear"]
ProductType = Literal[
    "beverage",
    "dairy",
    "yogurt",
    "cheese",
    "meat",
    "fish",
    "snack",
    "sweet",
    "cereal",
    "sauce",
    "bread",
    "ready_meal",
    "plant_protein",
    "dessert",
    "fruit_vegetable",
    "other",
]
NutriGrade = Literal["a", "b", "c", "d", "e"]
NutritionLevel = Literal["low", "moderate", "high", "unknown"]
FitLabel = Literal["great_fit", "good_fit", "neutral", "poor_fit"]
ScoreReasonKind = Literal["positive", "negative", "neutral"]
ScoreReasonSource = Literal["nutrition", "diet", "goal", "restriction", "product_type", "allergen", "ingredient"]


class DietCompatibility(TypedDict):
    vegan: DietCompatibilityValue
    vegetarian: DietCompatibilityValue
    halal: DietCompatibilityValue
    kosher: DietCompatibilityValue
    glutenFree: DietCompatibilityValue
    dairyFree: DietCompatibilityValue
    nutFree: DietCompatibilityValue


class DietCompatibilityReasons(TypedDict, total=False):
    vegan: Optional[str]
    vegetarian: Optional[str]
    halal: Optional[str]
    kosher: Optional[str]
    glutenFree: Optional[str]
    dairyFree: Optional[str]
    nutFree: Optional[str]


class NutritionFacts(TypedDict):
    calories: Optional[float]
    protein: Optional[float]
    fat: Optional[float]
    saturatedFat: Optional[float]
    carbs: Optional[float]
    sugars: Optional[float]
    fiber: Optional[float]
    salt: Optional[float]
    sodium: Optional[float]


class NutritionSummary(TypedDict):
    sugarLevel: NutritionLevel
    saltLevel: NutritionLevel
    calorieLevel: NutritionLevel
    proteinLevel: NutritionLevel
    fiberLevel: NutritionLevel
    saturatedFatLevel: NutritionLevel


class AiClassification(TypedDict):
    productType: Optional[ProductType]
    dietCompatibility: DietCompatibility
    dietCompatibilityReasons: Optional[DietCompatibilityReasons]
    nutriGrade: Optional[NutriGrade]


class ProductFacts(TypedDict):
    productType: Optional[ProductType]
    dietCompatibility: DietCompatibility
    dietCompatibilityReasons: Optional[DietCompatibilityReasons]
    nutritionFacts: NutritionFacts
    nutritionSummary: NutritionSummary
    nutriGrade: Optional[NutriGrade]


class ScoreReason(TypedDict):
    key: str
    label: str
    description: str
    value: Optional[float]
    unit: Optional[str]
    impact: float
    kind: ScoreReasonKind
    source: ScoreReasonSource


class ScoreBreakdownStep(TypedDict):
    rule: str
    label: str
    impact: float
    running: float


class ScoreBreakdown(TypedDict):
    baseScore: float
    steps: list[ScoreBreakdownStep]
    totalImpact: float
    rawScore: float
    finalScore: float


class AnalyzedIngredient(TypedDict):
    name: str
    status: Literal["good", "neutral", "warning", "bad"]
    reason: Optional[str]


class IngredientAnalysis(TypedDict):
    ingredients: list[AnalyzedIngredient]
    summary: Optional[str]


class ProfileProductScore(TypedDict):
    profileId: str
    profileType: Literal["self", "family_member"]
    name: str
    score: float
    fitLabel: FitLabel
    positives: list[ScoreReason]
    negatives: list[ScoreReason]
    scoreBreakdown: ScoreBreakdown


class ProductAnalysisResult(TypedDict, total=False):
    productFacts: ProductFacts
    profiles: list[ProfileProductScore]
    ingredientAnalysis: Optional[IngredientAnalysis]


class NormalizedProduct(TypedDict):
    """Normalized product data stored in DB and used through analysis pipeline."""

    code: str
    product_name: Optional[str]
    brands: Optional[str]
    image_url: Optional[str]
    ingredients_text: Optional[str]
    nutriscore_grade: Optional[str]
    categories: Optional[str]
    quantity: Optional[str]
    serving_size: Optional[str]
    ingredients: list[str]
    allergens: list[str]
    additives: list[str]
    additives_count: Optional[int]
    traces: list[str]
    countries: list[str]
    category_tags: list[str]
    images: dict
    nutrition: dict  # raw nutrition keys from OFF/websearch
    scores: dict  # nutriscore_grade, nutriscore_score, ecoscore_grade, ecoscore_score


class OnboardingProfile(TypedDict):
    """Profile info used for scoring (derived from UserProfile)."""

    profileId: str
    profileType: Literal["self", "family_member"]
    name: str
    mainGoal: Optional[str]
    restrictions: list[str]
    allergies: list[str]
    otherAllergiesText: Optional[str]
    nutritionPriorities: list[str]
    onboardingCompleted: bool
