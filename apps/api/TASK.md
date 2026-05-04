# TASK: Add `product-analyze-v2` module for barcode-based product analysis

## Context

The project already has an existing product analysis flow. Do **not** rewrite it and do **not** replace existing modules.

Create a new isolated NestJS module called `product-analyze-v2`.

Current domain model already supports products, scans, user profiles, family members, cached product data and personal analysis results. The new module should be added in parallel and should not break the existing flow.

For now, V2 must support **barcode analysis only**.

---

## Goal

Implement a new product analysis V2 flow where:

1. The user sends a barcode.
2. The backend fetches product data from Open Food Facts using the existing project client.
3. The fetched product is normalized.
4. Product role is classified.
5. Product role is validated.
6. Safety score, goal fit score and nutrition score are calculated.
7. The result is returned to the client.

All product retrieval, normalization, classification and scoring logic for this first version should be orchestrated inside **one LangGraph node**. The node should reuse the existing Open Food Facts client instead of performing raw HTTP calls.

---

## Module structure

Create the following structure:

```txt
src/product-analyze-v2/
  product-analyze-v2.module.ts
  product-analyze-v2.controller.ts
  product-analyze-v2.service.ts

  langgraph/
    product-analyze-v2.graph.ts
    nodes/
      analyze-barcode.node.ts

  constants/
    product-roles.constants.ts
    scoring-rules.constants.ts
    goal-role-weights.constants.ts
    validation-rules.constants.ts

  types/
    product-role.types.ts
    normalized-product.types.ts
    scoring.types.ts
    analyze-product-v2.types.ts
    open-food-facts.types.ts
```

Note: only keep `open-food-facts.types.ts` if V2 genuinely needs small adapter types. Prefer existing Open Food Facts client types when available.
```txt

  utils/
    normalize-open-food-facts-product.util.ts
    calculate-safety-score.util.ts
    calculate-goal-fit-score.util.ts
    calculate-nutrition-score.util.ts
    calculate-overall-score.util.ts
    validate-product-role.util.ts
    nutrient-score.util.ts
    serving-size.util.ts
```

Keep this module isolated. Do not move shared code from the current product analysis implementation unless absolutely necessary.

---

## Public API

Add a controller endpoint:

```ts
POST /product-analyze-v2/barcode
```

Request body:

```ts
{
  "barcode": "string"
}
```

Behavior:

- Analyze the product for the current authenticated user's main profile.
- If the user has an active subscription and the subscription is not expired, also analyze the product for all family members.
- If the user's subscription is inactive, missing, cancelled, expired, or `subscriptionExpiry` is in the past, analyze only for the main user profile.
- Use the current auth/user extraction pattern already used in the project.
- Do not accept `profileId` in the request body for this MVP.

Response:

```ts
{
  "barcode": "string",
    "product": {
    "name": "string | null",
      "brand": "string | null",
      "imageUrl": "string | null",
      "ingredients": ["string"],
      "allergens": ["string"],
      "traces": ["string"],
      "additives": ["string"],
      "nutrition": {
      "caloriesPer100g": "number | null",
        "caloriesPerServing": "number | null",
        "proteinPer100g": "number | null",
        "carbsPer100g": "number | null",
        "sugarPer100g": "number | null",
        "fatPer100g": "number | null",
        "saturatedFatPer100g": "number | null",
        "fiberPer100g": "number | null",
        "sodiumPer100g": "number | null"
    }
  },
  "analysis": {
    "mainProfile": {
      "profileType": "user",
        "profileId": "string",
        "displayName": "string | null",
        "role": {
        "value": "ProductRole",
          "source": "ai | fallback | rule",
          "confidence": "number",
          "validated": "boolean",
          "evidence": ["string"]
      },
      "safety": {
        "score": "number",
          "status": "safe | caution | avoid",
          "reasons": ["string"],
          "matchedAllergens": ["string"],
          "violatedRestrictions": ["string"]
      },
      "goalFit": {
        "score": "number",
          "goal": "MainGoal | null",
          "role": "ProductRole",
          "positives": ["string"],
          "negatives": ["string"],
          "details": "Record<string, unknown>"
      },
      "nutrition": {
        "score": "number",
          "positives": ["string"],
          "negatives": ["string"],
          "details": "Record<string, unknown>"
      },
      "overall": {
        "score": "number",
          "rating": "excellent | good_choice | okay | use_with_caution | avoid",
          "summary": "string"
      }
    },
    "familyMembers": [
      {
        "profileType": "family_member",
        "familyMemberId": "string",
        "displayName": "string",
        "role": {
          "value": "ProductRole",
          "source": "ai | fallback | rule",
          "confidence": "number",
          "validated": "boolean",
          "evidence": ["string"]
        },
        "safety": "same shape as mainProfile.safety",
        "goalFit": "same shape as mainProfile.goalFit",
        "nutrition": "same shape as mainProfile.nutrition",
        "overall": "same shape as mainProfile.overall"
      }
    ],
      "subscription": {
      "analyzedFamilyMembers": "boolean",
        "reason": "active_subscription | missing_subscription | inactive_subscription | expired_subscription"
    }
  }
}
```

---

## Subscription and family-member analysis rules

Use the existing `User` fields:

```ts
subscriptionStatus
subscriptionExpiry
familyMembers
profile
```

Family-member analysis is enabled only when:

```ts
subscriptionStatus === 'active'
AND (
  subscriptionExpiry is null
OR subscriptionExpiry > now
)
```

If this condition is false, analyze only the main user profile.

Subscription reason mapping:

```ts
if subscriptionStatus is missing/null:
reason = 'missing_subscription'

else if subscriptionStatus !== 'active':
reason = 'inactive_subscription'

else if subscriptionExpiry exists and subscriptionExpiry <= now:
reason = 'expired_subscription'

else:
reason = 'active_subscription'
```

Important:

- Product role classification and role validation are product-level operations. Do them once per barcode.
- Safety score and goal fit score are profile-level operations. Do them separately for the main profile and each eligible family member.
- Nutrition score is product-level and can be reused for all profiles.
- Overall score should be calculated per profile because it depends on safety and goal fit.
- Do not analyze family members for users without an active, non-expired subscription.

---

## Product roles

Create a controlled enum/union. AI must only return one of these roles.

```ts
export type ProductRole =
  | 'generic_food'
  | 'lean_protein'
  | 'fatty_protein'
  | 'processed_meat'
  | 'seafood'
  | 'egg_product'
  | 'dairy_high_protein'
  | 'whole_grain'
  | 'refined_grain'
  | 'starchy_food'
  | 'breakfast_cereal'
  | 'bakery'
  | 'oil'
  | 'nuts_seeds'
  | 'spread_fat'
  | 'vegetable'
  | 'fruit'
  | 'legume'
  | 'savory_snack'
  | 'sweet_snack'
  | 'dessert'
  | 'candy_chocolate'
  | 'water_unsweetened_drink'
  | 'sugary_drink'
  | 'juice_smoothie'
  | 'sauce_condiment'
  | 'sweetener'
  | 'supplement'
  | 'baby_food'
  | 'meal_replacement'
  | 'ready_meal';
```

No `secondaryRole` for now.

---

## LangGraph requirement

Create a V2 LangGraph with one node for now:

```txt
START -> analyzeBarcodeNode -> END
```

The node should do all V2 work for now:

1. Fetch product from Open Food Facts by barcode using the existing Open Food Facts client.
2. Normalize product data.
3. Load the current authenticated user with subscription fields.
4. Load the main user profile.
5. If subscription is active and not expired, load all family members.
6. Classify product role once for the product.
7. Validate product role once for the product.
8. Calculate safety score, goal fit score, nutrition score and overall score for the main profile.
9. If family analysis is enabled, calculate the same scores for every family member.
10. Return structured result.

Suggested files:

```txt
src/product-analyze-v2/langgraph/product-analyze-v2.graph.ts
src/product-analyze-v2/langgraph/nodes/analyze-barcode.node.ts
```

The graph can be simple now. It is added mainly so the flow can be expanded later.

---

## Open Food Facts fetching

The project already has an existing Open Food Facts client.

Do **not** create direct `fetch` calls.
Do **not** create a new Open Food Facts HTTP client.
Do **not** duplicate existing Open Food Facts request logic.

Use the existing Open Food Facts client through NestJS dependency injection.

Requirements:

- Reuse the existing client method for fetching product data by barcode.
- If the existing client response type is available, use it instead of redefining raw response types.
- If additional typing is needed for V2 normalization, create local V2 types only for normalized output and analysis result, not for duplicating the entire Open Food Facts API response.
- Handle product not found.
- Handle missing nutrition fields.
- Handle missing serving size.
- Handle errors returned or thrown by the existing Open Food Facts client.
- Do not fail the whole analysis if non-critical fields are missing.
- Return clear errors for invalid barcode or product not found.

The V2 LangGraph node should call the existing Open Food Facts client, then pass the returned product payload into the V2 normalization utility.

---

## Normalization

Implement:

```ts
normalizeOpenFoodFactsProduct(rawProduct): NormalizedProduct
```

The normalized product should include:

```ts
export interface NormalizedProduct {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  ingredients: string[];
  allergens: string[];
  traces: string[];
  additives: string[];
  categories: string[];
  servingSizeText: string | null;
  servingSizeGrams: number | null;
  servingSizeMl: number | null;
  nutrition: {
    caloriesPer100g: number | null;
    caloriesPerServing: number | null;
    proteinPer100g: number | null;
    carbsPer100g: number | null;
    sugarPer100g: number | null;
    fatPer100g: number | null;
    saturatedFatPer100g: number | null;
    fiberPer100g: number | null;
    sodiumPer100g: number | null;
    saltPer100g: number | null;
  };
}
```

Important:

- Prefer `nutriments.energy-kcal_100g` for kcal.
- Use `nutriments.proteins_100g`, `carbohydrates_100g`, `sugars_100g`, `fat_100g`, `saturated-fat_100g`, `fiber_100g`, `sodium_100g`, `salt_100g`.
- Calculate `caloriesPerServing` only when serving size is parseable.
- If serving size is not parseable, keep it as `null`.

---

## Product role classification

For MVP, implement this with AI, but keep it safe:

AI may return product-level role information:

```ts
{
  "role": "oil",
  "confidence": 0.94,
  "evidence": [
    "Product name contains olive oil",
    "Ingredients contain olive oil",
    "Fat is the dominant macronutrient"
  ]
}
```

The combined AI call may also return profile-level detections. Every detection must include `ingredients`:

```ts
{
  "profileInfo": [
    {
      "profileType": "user",
      "profileId": "profile_123",
      "allergenDetections": [
        {
          "allergy": "DAIRY",
          "detected": true,
          "source": "ingredient_text",
          "confidence": 0.98,
          "ingredients": ["milk protein"],
          "evidence": ["Ingredient list contains milk protein."]
        }
      ],
      "restrictionDetections": [
        {
          "restriction": "VEGAN",
          "compatible": false,
          "source": "ingredient_text",
          "confidence": 0.98,
          "ingredients": ["milk protein"],
          "evidence": ["Milk protein is animal-derived."]
        }
      ]
    }
  ]
}
```

Rules:

- AI must return only one role from `ProductRole`.
- AI must include confidence from `0` to `1`.
- AI must include evidence.
- AI must not return score.
- AI must not return scoring weights.
- AI must not decide whether product is healthy.
- If AI output is invalid, fallback to `generic_food`.
- If confidence is below `0.75`, fallback to `generic_food`.

Use a strict schema if the project already has Zod or similar validation. If not, implement a lightweight runtime validation function.

---

## AI profile detection fields

For every `allergenDetections` item, include an `ingredients` array.

For every `restrictionDetections` item, include an `ingredients` array.

These arrays should contain the exact product ingredients that caused the detection.

Examples:

```ts
{
  allergy: 'DAIRY',
  detected: true,
  source: 'ingredient_text',
  confidence: 0.98,
  ingredients: ['milk protein', 'skimmed milk powder'],
  evidence: ['The product contains milk protein and skimmed milk powder.']
}
```

```ts
{
  restriction: 'VEGAN',
  compatible: false,
  source: 'ingredient_text',
  confidence: 0.98,
  ingredients: ['milk protein'],
  evidence: ['Milk protein is animal-derived and not compatible with a vegan restriction.']
}
```

Rules:

- `ingredients` must be an array of strings.
- Use exact ingredient names or phrases from the normalized product ingredient list when possible.
- If the detection comes only from an Open Food Facts allergen/tag and no exact ingredient is available, use an empty array and explain the tag in `evidence`.
- If `detected === false` for an allergen, `ingredients` should usually be an empty array.
- If `compatible === true` for a restriction, `ingredients` should usually be an empty array unless explaining a positive compatibility signal is useful.
- Backend must not rely only on this field for scoring; it is primarily for explainability and validation support.

---

## Role validation

Implement:

```ts
validateProductRole(role: ProductRole, product: NormalizedProduct): boolean
```

Start with only a few validation rules. Everything else can return true for now.

Examples:

```ts
oil:
  fatPer100g >= 70
  carbsPer100g <= 5
  proteinPer100g <= 5

lean_protein:
  proteinPer100g >= 15
  saturatedFatPer100g <= 5

sugary_drink:
  sugarPer100g >= 5
  caloriesPer100g <= 100

water_unsweetened_drink:
  sugarPer100g <= 1
  caloriesPer100g <= 10

nuts_seeds:
  fatPer100g >= 30
  proteinPer100g >= 8
```

If validation fails, use:

```ts
role = 'generic_food'
validated = false
```

---

## Safety score

Implement safety scoring before goal/nutrition scoring.

Inputs:

- user restrictions
- user allergies
- product allergens
- product traces
- product ingredients

Output:

```ts
{
  score: number;
  status: 'safe' | 'caution' | 'avoid';
  reasons: string[];
  matchedAllergens: string[];
  violatedRestrictions: string[];
}
```

Rules for MVP:

- Confirmed allergen match => score `0`, status `avoid`.
- Trace allergen match => subtract `50`, status at least `caution`.
- Confirmed hard restriction violation => max score `20`, status `avoid`.
- Uncertain match => subtract `20`, status at least `caution`.
- Clamp score to `0..100`.

Keep this deterministic. Do not let AI decide safety score.

---

## Goal fit score

Implement goal fit as:

```ts
goalFitScore = weightedAverage(subScores, weights)
```

Weights come from:

```txt
constants/goal-role-weights.constants.ts
```

Use:

```ts
getGoalRoleWeights(goal: MainGoal | null, role: ProductRole)
```

Start with these roles only:

- `generic_food`
- `oil`
- `sugary_drink`
- `lean_protein`
- `sweet_snack`
- `savory_snack`
- `ready_meal`

All other roles should fallback to `generic_food` weights for now.

Example for `WEIGHT_LOSS + oil`:

```ts
{
  caloriesPerServing: 0.35,
  unsaturatedFatRatio: 0.35,
  saturatedFat: 0.20,
  sodium: 0.05,
  additives: 0.05
}
```

Example for `WEIGHT_LOSS + generic_food`:

```ts
{
  caloriesPerServing: 0.30,
  protein: 0.25,
  sugar: 0.20,
  fiber: 0.15,
  saturatedFat: 0.10
}
```

If `caloriesPerServing` is null, fallback to `caloriesPer100g` with lower confidence/details note.

Return:

```ts
{
  score: number;
  goal: MainGoal | null;
  role: ProductRole;
  positives: string[];
  negatives: string[];
  details: Record<string, unknown>;
}
```

---

## Nutrition score

Nutrition score is not personalized. It should evaluate general nutrition quality.

For MVP:

```ts
nutritionScore =
  positiveScore * 0.45 +
  negativeScore * 0.45 +
  processingScore * 0.10
```

Positive factors:

- protein
- fiber
- simple ingredient list if available

Negative factors:

- sugar
- sodium
- saturated fat
- calorie density

Processing factors:

- additives count
- long ingredient list

Return:

```ts
{
  score: number;
  positives: string[];
  negatives: string[];
  details: Record<string, unknown>;
}
```

---

## Overall score

Safety should act as a gatekeeper.

Implement:

```ts
if (safety.score === 0) {
  overallScore = Math.min(goalFit.score, 20)
  rating = 'avoid'
} else if (safety.score < 40) {
  overallScore = Math.min(goalFit.score, 40)
  rating = 'use_with_caution'
} else {
  overallScore =
    safety.score * 0.40 +
    goalFit.score * 0.35 +
    nutrition.score * 0.25
}
```

Rating thresholds:

```ts
90..100 => excellent
75..89  => good_choice
60..74  => okay
40..59  => use_with_caution
0..39   => avoid
```

---

## Utility requirements

Create reusable scoring helpers:

```ts
clampScore(value: number): number
weightedAverage(scores: Record<string, number | null>, weights: Record<string, number>): number
scoreLowerIsBetter(value: number | null, best: number, worst: number): number | null
scoreHigherIsBetter(value: number | null, worst: number, best: number): number | null
```

If a score input is null:

- exclude that metric from weighted average
- renormalize remaining weights
- add a note to `details.missingMetrics`

---

## Example: olive oil

Input:

```ts
{
  "barcode": "example-barcode"
}
```

Open Food Facts normalized data:

```ts
{
  "name": "Extra Virgin Olive Oil",
  "ingredients": ["extra virgin olive oil"],
  "nutrition": {
    "caloriesPer100g": 884,
    "caloriesPerServing": 119,
    "proteinPer100g": 0,
    "carbsPer100g": 0,
    "sugarPer100g": 0,
    "fatPer100g": 100,
    "saturatedFatPer100g": 14,
    "fiberPer100g": 0,
    "sodiumPer100g": 0
  }
}
```

AI role classification:

```ts
{
  "role": "oil",
  "confidence": 0.94,
  "evidence": [
    "Product name contains olive oil",
    "Ingredients contain olive oil",
    "Fat is the dominant macronutrient"
  ]
}
```

Backend validation:

```ts
fatPer100g >= 70
carbsPer100g <= 5
proteinPer100g <= 5
```

Result:

```ts
{
  "analysis": {
    "role": {
      "value": "oil",
      "source": "ai",
      "confidence": 0.94,
      "validated": true,
      "evidence": [
        "Product name contains olive oil",
        "Ingredients contain olive oil",
        "Fat is the dominant macronutrient"
      ]
    },
    "safety": {
      "score": 100,
      "status": "safe",
      "reasons": [],
      "matchedAllergens": [],
      "violatedRestrictions": []
    },
    "goalFit": {
      "score": 81,
      "goal": "WEIGHT_LOSS",
      "role": "oil",
      "positives": [
        "Good fat profile",
        "No sugar",
        "Very low sodium"
      ],
      "negatives": [
        "Calorie-dense, portion size matters"
      ],
      "details": {
        "usedServingSize": true
      }
    },
    "nutrition": {
      "score": 72,
      "positives": [
        "Minimal ingredients",
        "High unsaturated fat",
        "No sugar"
      ],
      "negatives": [
        "High calorie density",
        "Contains saturated fat"
      ],
      "details": {}
    },
    "overall": {
      "score": 86,
      "rating": "good_choice",
      "summary": "Good choice for this goal when used in reasonable portions."
    }
  }
}
```

---

## Critical constraints

- Do not rewrite existing product analysis flow.
- Do not modify existing API behavior.
- Do not store V2 results in database unless explicitly needed.
- Do not add `secondaryRole` yet.
- Do not let AI calculate scores.
- Do not let AI return weights.
- Do not let AI decide safety.
- Do not fail analysis on missing non-critical nutrition fields.
- Keep all scoring deterministic and testable.
- Keep constants separated from logic.

---

NEVER ADD SPEC OR TESTS FILE.

---

## Acceptance criteria

- `product-analyze-v2` module exists and compiles.
- `POST /product-analyze-v2/barcode` exists.
- Barcode analysis fetches product data from Open Food Facts through the existing project client.
- No direct `fetch` calls or duplicated Open Food Facts client are introduced.
- V2 flow is implemented through a simple LangGraph with one node.
- AI classifies only `ProductRole`.
- Backend validates AI role before scoring.
- Safety, goal fit, nutrition and overall scores are returned for the main profile.
- If the user has an active, non-expired subscription, scores are also returned for all family members.
- If the user does not have an active, non-expired subscription, family members are not analyzed.
- Existing product analysis flow remains untouched.
- Missing nutrition fields do not crash the analysis.
- cover all flow with logs;
