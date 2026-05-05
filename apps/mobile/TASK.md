# Task: Implement Frontend Product Compare Winner Algorithm per Profile

## Context

The backend compare endpoint returns two analyzed products.

Each product contains:

- `barcode`
- `product`
- `profiles`
- `productId`
- `scanId`

Each item inside `profiles` represents the analysis result for one profile, such as the current user or a family member.

Example response shape:

```ts
{
  products: [
    {
      barcode: string;
      productId: string;
      scanId: string;
      product: {
        name: string;
        brand?: string;
        traces?: string[];
        imageUrl?: string;
        additives?: string[];
        allergens?: string[];
        ingredients?: string[];
        nutrition?: {
          fatPer100g?: number;
          carbsPer100g?: number;
          fiberPer100g?: number;
          sugarPer100g?: number;
          sodiumPer100g?: number;
          proteinPer100g?: number;
          caloriesPer100g?: number;
          caloriesPerServing?: number;
          saturatedFatPer100g?: number;
        };
      };
      profiles: [
        {
          profileId: string;
          displayName: string;
          type: "user" | "family_member";
          analysis: ProductAnalysis;
          ai?: ProductAiAnalysis;
        }
      ];
    }
  ];
}
```

The frontend needs to compare the two products independently for each profile.

For every profile, we need to determine:

1. The best product for that profile, if a suitable product exists.
2. Or that none of the products are suitable.
3. What the winning product is better at.
4. What the other product may be better at.

The algorithm must use the existing backend compare response without requiring backend changes.

---

## Goal

Create a frontend utility that takes the compare response and returns comparison results grouped by profile.

Suggested function name:

```ts
getCompareResultsByProfile(compareResponse);
```

Expected usage:

```ts
const profileCompareResults = getCompareResultsByProfile(compareResponse);
```

---

## Required Output Shape

Implement a result shape similar to this:

```ts
type ProfileCompareResult = {
  profileId: string;
  displayName: string;
  type: 'user' | 'family_member';

  status: 'winner_found' | 'no_suitable_product' | 'equivalent';

  winner: ComparedProduct | null;
  otherProduct: ComparedProduct | null;

  winnerBestAt: CompareFact[];
  anotherProductMayBeBetterAt: CompareFact[];
};
```

```ts
type ComparedProduct = {
  barcode: string;
  productId: string;
  scanId: string;
  product: Product;
  profile: ProductProfileAnalysis;
  analysis: ProductAnalysis;
};
```

```ts
type CompareFact = {
  key: string;
  label: string;
  value?: string | number | null;
  comparedTo?: string | number | null;
  category: 'safety' | 'allergens' | 'restrictions' | 'nutrition' | 'ingredients';
};
```

---

## Core Requirements

### 1. Group Compared Products by Profile

The compare response contains two products.

Each product contains analysis for multiple profiles.

The algorithm must group product results by `profileId`.

Example internal structure:

```ts
{
  "profile-1": [
    productAForProfile1,
    productBForProfile1
  ],
  "profile-2": [
    productAForProfile2,
    productBForProfile2
  ]
}
```

Each profile must be compared independently.

---

### 2. Support the No Winner Case

There may be no winner.

If both products are unsuitable for a profile, the algorithm must return `no_suitable_product`.

Do not select a “least bad” product as the winner.

A product should be treated as unsuitable if:

```ts
analysis.safety?.status === 'avoid' || analysis.overall?.rating === 'avoid';
```

If both compared products are unsuitable:

```ts
return {
  profileId,
  displayName,
  type,
  status: 'no_suitable_product',
  winner: null,
  otherProduct: null,
  winnerBestAt: [],
  anotherProductMayBeBetterAt: [],
};
```

This is a valid and expected result.

The UI should show that neither product is recommended for that profile.

Recommended UI copy:

```text
No suitable product for this profile
```

or:

```text
Neither product is recommended for this profile
```

---

### 3. Determine the Winner When a Suitable Product Exists

If at least one product is suitable, determine the winner using this priority:

1. Overall score
2. Safety status
3. Goal fit score
4. Nutrition score
5. Fewer negatives

Safety must always have higher priority than nutrition.

Recommended safety ranking:

```ts
function getSafetyRank(status?: string) {
  if (status === 'safe') return 3;
  if (status === 'caution') return 2;
  if (status === 'avoid') return 1;
  return 0;
}
```

Comparison priority:

```ts
safety > overall score > goalFit score > nutrition score > fewer negatives
```

Scores are allowed for internal ranking only.

Do not expose score-based facts in `winnerBestAt` or `anotherProductMayBeBetterAt`.

---

### 4. Support Equivalent Products

Products may be effectively equal.

For example:

- same safety status;
- same or very close overall score;
- same or very close goal fit score;
- same or very close nutrition score.

Recommended rule:

```ts
const isEquivalent =
  Math.abs((a.analysis.overall?.score ?? 0) - (b.analysis.overall?.score ?? 0)) <= 2 &&
  a.analysis.safety?.status === b.analysis.safety?.status &&
  Math.abs((a.analysis.goalFit?.score ?? 0) - (b.analysis.goalFit?.score ?? 0)) <= 2 &&
  Math.abs((a.analysis.nutrition?.score ?? 0) - (b.analysis.nutrition?.score ?? 0)) <= 2;
```

If products are equivalent, return:

```ts
status: 'equivalent';
```

It is okay to keep a technical `winner` and `otherProduct` for display ordering, but the UI must treat the result as equivalent.

Recommended UI copy:

```text
Both products are similarly suitable for this profile
```

---

## Fact Generation Requirements

For each profile comparison, generate two fact arrays:

```ts
winnerBestAt: CompareFact[];
anotherProductMayBeBetterAt: CompareFact[];
```

### Purpose

These facts should explain concrete, user-facing advantages of each product.

They should answer:

- What is the winner better at?
- What may the other product be better at?

Both arrays should use the same comparison logic, but with product order reversed.

```ts
winnerBestAt = buildComparisonFacts(winner, otherProduct);
anotherProductMayBeBetterAt = buildComparisonFacts(otherProduct, winner);
```

Each array must contain no more than 8 facts.

---

## Important: Do Not Show Score Facts

Scores can be used internally to choose the winner.

However, score-based facts must not be included in `winnerBestAt` or `anotherProductMayBeBetterAt`.

Do not generate facts like:

```ts
{ key: "overall-score", label: "Higher overall score" }
{ key: "goal-fit", label: "Better goal fit score" }
{ key: "nutrition-score", label: "Better nutrition score" }
```

Bad fact examples:

- `Higher overall score`
- `Better nutrition score`
- `Better goal fit score`

Good fact examples:

- `Higher protein`
- `More fiber`
- `Lower sugar`
- `Lower fat`
- `Lower saturated fat`
- `Lower sodium`
- `Lower calories`
- `Fewer additives`
- `Simpler ingredient list`
- `Doesn't include your allergens`
- `Matches your diet`

Summary rule:

```text
Scores decide who wins. Facts explain why in human terms.
```

---

## Fact Label Rules

Fact labels should describe a clear advantage.

The advantage can be either higher or lower depending on the metric.

Do not assume that all facts are “Higher ...”.

Some metrics are better when higher:

- protein
- fiber
- unsaturated fat ratio, if available

Some metrics are better when lower:

- sugar
- fat, depending on product/category context
- saturated fat
- sodium
- calories
- calories per serving
- additives count
- ingredient count
- matched allergens count
- violated restrictions count

---

## Suggested Comparison Facts

### Safety and Profile Match Facts

If one product has no matched allergens and the other product has matched allergens:

```ts
{
  key: "allergens",
  label: "Doesn't include your allergens",
  category: "allergens"
}
```

If both products have matched allergens but one has fewer:

```ts
{
  key: "allergens",
  label: "Fewer allergen conflicts",
  value: matchedAllergensCount,
  comparedTo: otherMatchedAllergensCount,
  category: "allergens"
}
```

If one product does not violate dietary restrictions and the other does:

```ts
{
  key: "diet-match",
  label: "Matches your diet",
  category: "restrictions"
}
```

If both products violate restrictions but one violates fewer:

```ts
{
  key: "restrictions",
  label: "Fewer diet conflicts",
  value: violatedRestrictionsCount,
  comparedTo: otherViolatedRestrictionsCount,
  category: "restrictions"
}
```

If one product has a better safety status:

```ts
{
  key: "safety",
  label: "Safer for this profile",
  category: "safety"
}
```

---

### Nutrition Facts

Use these product nutrition fields when available:

```ts
product.nutrition.proteinPer100g;
product.nutrition.fiberPer100g;
product.nutrition.sugarPer100g;
product.nutrition.fatPer100g;
product.nutrition.saturatedFatPer100g;
product.nutrition.sodiumPer100g;
product.nutrition.caloriesPer100g;
product.nutrition.caloriesPerServing;
```

Generate facts only when the difference is meaningful.

Recommended nutrition facts:

```ts
{
  key: "protein",
  label: "Higher protein",
  value: betterProtein,
  comparedTo: otherProtein,
  category: "nutrition"
}
```

```ts
{
  key: "fiber",
  label: "More fiber",
  value: betterFiber,
  comparedTo: otherFiber,
  category: "nutrition"
}
```

```ts
{
  key: "sugar",
  label: "Lower sugar",
  value: lowerSugar,
  comparedTo: otherSugar,
  category: "nutrition"
}
```

```ts
{
  key: "fat",
  label: "Lower fat",
  value: lowerFat,
  comparedTo: otherFat,
  category: "nutrition"
}
```

```ts
{
  key: "saturated-fat",
  label: "Lower saturated fat",
  value: lowerSaturatedFat,
  comparedTo: otherSaturatedFat,
  category: "nutrition"
}
```

```ts
{
  key: "sodium",
  label: "Lower sodium",
  value: lowerSodium,
  comparedTo: otherSodium,
  category: "nutrition"
}
```

```ts
{
  key: "calories",
  label: "Lower calories",
  value: lowerCalories,
  comparedTo: otherCalories,
  category: "nutrition"
}
```

```ts
{
  key: "calories-per-serving",
  label: "Lower calories per serving",
  value: lowerCaloriesPerServing,
  comparedTo: otherCaloriesPerServing,
  category: "nutrition"
}
```

---

### Ingredient Facts

If one product has fewer additives:

```ts
{
  key: "additives",
  label: "Fewer additives",
  value: additivesCount,
  comparedTo: otherAdditivesCount,
  category: "ingredients"
}
```

If one product has fewer ingredients:

```ts
{
  key: "ingredients",
  label: "Simpler ingredient list",
  value: ingredientsCount,
  comparedTo: otherIngredientsCount,
  category: "ingredients"
}
```

---

## Meaningful Difference Rules

Avoid generating noisy facts for tiny differences.

Use simple thresholds where possible.

Suggested thresholds:

```ts
const MEANINGFUL_DIFF = {
  proteinPer100g: 1,
  fiberPer100g: 1,
  sugarPer100g: 1,
  fatPer100g: 2,
  saturatedFatPer100g: 1,
  sodiumPer100g: 0.05,
  caloriesPer100g: 20,
  caloriesPerServing: 20,
  additivesCount: 1,
  ingredientsCount: 3,
};
```

Examples:

- Do not show `Higher protein` if the difference is only `0.1g`.
- Do not show `Lower calories` if the difference is only `3 kcal`.
- Do not show `Simpler ingredient list` if one product has 10 ingredients and the other has 9.

These thresholds can be adjusted to match existing product scoring conventions.

---

## Suggested Implementation

### Main Utility

```ts
export function getCompareResultsByProfile(
  compareResponse: CompareResponse,
): ProfileCompareResult[] {
  const productsByProfile = groupProductsByProfile(compareResponse.products);

  return Object.values(productsByProfile)
    .filter((profileProducts) => profileProducts.length === 2)
    .map((profileProducts) => getBestProductForProfile(profileProducts));
}
```

---

### Group Products by Profile

```ts
function groupProductsByProfile(products: CompareProductItem[]) {
  const result: Record<string, ComparedProduct[]> = {};

  for (const productItem of products) {
    for (const profile of productItem.profiles ?? []) {
      if (!result[profile.profileId]) {
        result[profile.profileId] = [];
      }

      result[profile.profileId].push({
        barcode: productItem.barcode,
        productId: productItem.productId,
        scanId: productItem.scanId,
        product: productItem.product,
        profile,
        analysis: profile.analysis,
      });
    }
  }

  return result;
}
```

---

### Get Best Product for One Profile

```ts
function getBestProductForProfile(profileProducts: ComparedProduct[]): ProfileCompareResult {
  const [a, b] = profileProducts;

  const profile = a.profile;

  const bothAreUnsuitable = isUnsuitable(a.analysis) && isUnsuitable(b.analysis);

  if (bothAreUnsuitable) {
    return {
      profileId: profile.profileId,
      displayName: profile.displayName,
      type: profile.type,
      status: 'no_suitable_product',
      winner: null,
      otherProduct: null,
      winnerBestAt: [],
      anotherProductMayBeBetterAt: [],
    };
  }

  const comparison = compareProductsForProfile(a, b);

  const winner = comparison >= 0 ? a : b;
  const otherProduct = comparison >= 0 ? b : a;

  const equivalent = isEquivalent(a, b);

  return {
    profileId: profile.profileId,
    displayName: profile.displayName,
    type: profile.type,
    status: equivalent ? 'equivalent' : 'winner_found',
    winner,
    otherProduct,
    winnerBestAt: buildComparisonFacts(winner, otherProduct),
    anotherProductMayBeBetterAt: buildComparisonFacts(otherProduct, winner),
  };
}
```

---

### Unsuitable Check

```ts
function isUnsuitable(analysis: ProductAnalysis) {
  return analysis.safety?.status === 'avoid' || analysis.overall?.rating === 'avoid';
}
```

---

### Product Ranking

```ts
function compareProductsForProfile(a: ComparedProduct, b: ComparedProduct) {
  const aSafety = getSafetyRank(a.analysis.safety?.status);
  const bSafety = getSafetyRank(b.analysis.safety?.status);

  if (aSafety !== bSafety) return aSafety - bSafety;

  const aOverall = a.analysis.overall?.score ?? 0;
  const bOverall = b.analysis.overall?.score ?? 0;

  if (aOverall !== bOverall) return aOverall - bOverall;

  const aGoalFit = a.analysis.goalFit?.score ?? 0;
  const bGoalFit = b.analysis.goalFit?.score ?? 0;

  if (aGoalFit !== bGoalFit) return aGoalFit - bGoalFit;

  const aNutrition = a.analysis.nutrition?.score ?? 0;
  const bNutrition = b.analysis.nutrition?.score ?? 0;

  if (aNutrition !== bNutrition) return aNutrition - bNutrition;

  const aNegatives = a.analysis.negatives?.length ?? 0;
  const bNegatives = b.analysis.negatives?.length ?? 0;

  return bNegatives - aNegatives;
}
```

---

### Equivalent Check

```ts
function isEquivalent(a: ComparedProduct, b: ComparedProduct) {
  const overallDiff = Math.abs((a.analysis.overall?.score ?? 0) - (b.analysis.overall?.score ?? 0));

  const goalFitDiff = Math.abs((a.analysis.goalFit?.score ?? 0) - (b.analysis.goalFit?.score ?? 0));

  const nutritionDiff = Math.abs(
    (a.analysis.nutrition?.score ?? 0) - (b.analysis.nutrition?.score ?? 0),
  );

  return (
    a.analysis.safety?.status === b.analysis.safety?.status &&
    overallDiff <= 2 &&
    goalFitDiff <= 2 &&
    nutritionDiff <= 2
  );
}
```

---

### Build Comparison Facts

```ts
function buildComparisonFacts(
  betterProduct: ComparedProduct,
  otherProduct: ComparedProduct,
): CompareFact[] {
  const facts: CompareFact[] = [];

  const better = betterProduct.analysis;
  const other = otherProduct.analysis;

  const betterNutrition = betterProduct.product?.nutrition;
  const otherNutrition = otherProduct.product?.nutrition;

  if (getSafetyRank(better.safety?.status) > getSafetyRank(other.safety?.status)) {
    facts.push({
      key: 'safety',
      label: 'Safer for this profile',
      category: 'safety',
    });
  }

  const betterAllergens = better.safety?.matchedAllergens?.length ?? 0;
  const otherAllergens = other.safety?.matchedAllergens?.length ?? 0;

  if (betterAllergens === 0 && otherAllergens > 0) {
    facts.push({
      key: 'allergens',
      label: "Doesn't include your allergens",
      category: 'allergens',
    });
  } else if (betterAllergens < otherAllergens) {
    facts.push({
      key: 'allergens',
      label: 'Fewer allergen conflicts',
      value: betterAllergens,
      comparedTo: otherAllergens,
      category: 'allergens',
    });
  }

  const betterRestrictions = better.safety?.violatedRestrictions?.length ?? 0;
  const otherRestrictions = other.safety?.violatedRestrictions?.length ?? 0;

  if (betterRestrictions === 0 && otherRestrictions > 0) {
    facts.push({
      key: 'diet-match',
      label: 'Matches your diet',
      category: 'restrictions',
    });
  } else if (betterRestrictions < otherRestrictions) {
    facts.push({
      key: 'restrictions',
      label: 'Fewer diet conflicts',
      value: betterRestrictions,
      comparedTo: otherRestrictions,
      category: 'restrictions',
    });
  }

  if (
    isMeaningfullyHigher(
      betterNutrition?.proteinPer100g,
      otherNutrition?.proteinPer100g,
      MEANINGFUL_DIFF.proteinPer100g,
    )
  ) {
    facts.push({
      key: 'protein',
      label: 'Higher protein',
      value: betterNutrition?.proteinPer100g,
      comparedTo: otherNutrition?.proteinPer100g,
      category: 'nutrition',
    });
  }

  if (
    isMeaningfullyHigher(
      betterNutrition?.fiberPer100g,
      otherNutrition?.fiberPer100g,
      MEANINGFUL_DIFF.fiberPer100g,
    )
  ) {
    facts.push({
      key: 'fiber',
      label: 'More fiber',
      value: betterNutrition?.fiberPer100g,
      comparedTo: otherNutrition?.fiberPer100g,
      category: 'nutrition',
    });
  }

  if (
    isMeaningfullyLower(
      betterNutrition?.sugarPer100g,
      otherNutrition?.sugarPer100g,
      MEANINGFUL_DIFF.sugarPer100g,
    )
  ) {
    facts.push({
      key: 'sugar',
      label: 'Lower sugar',
      value: betterNutrition?.sugarPer100g,
      comparedTo: otherNutrition?.sugarPer100g,
      category: 'nutrition',
    });
  }

  if (
    isMeaningfullyLower(
      betterNutrition?.fatPer100g,
      otherNutrition?.fatPer100g,
      MEANINGFUL_DIFF.fatPer100g,
    )
  ) {
    facts.push({
      key: 'fat',
      label: 'Lower fat',
      value: betterNutrition?.fatPer100g,
      comparedTo: otherNutrition?.fatPer100g,
      category: 'nutrition',
    });
  }

  if (
    isMeaningfullyLower(
      betterNutrition?.saturatedFatPer100g,
      otherNutrition?.saturatedFatPer100g,
      MEANINGFUL_DIFF.saturatedFatPer100g,
    )
  ) {
    facts.push({
      key: 'saturated-fat',
      label: 'Lower saturated fat',
      value: betterNutrition?.saturatedFatPer100g,
      comparedTo: otherNutrition?.saturatedFatPer100g,
      category: 'nutrition',
    });
  }

  if (
    isMeaningfullyLower(
      betterNutrition?.sodiumPer100g,
      otherNutrition?.sodiumPer100g,
      MEANINGFUL_DIFF.sodiumPer100g,
    )
  ) {
    facts.push({
      key: 'sodium',
      label: 'Lower sodium',
      value: betterNutrition?.sodiumPer100g,
      comparedTo: otherNutrition?.sodiumPer100g,
      category: 'nutrition',
    });
  }

  if (
    isMeaningfullyLower(
      betterNutrition?.caloriesPer100g,
      otherNutrition?.caloriesPer100g,
      MEANINGFUL_DIFF.caloriesPer100g,
    )
  ) {
    facts.push({
      key: 'calories',
      label: 'Lower calories',
      value: betterNutrition?.caloriesPer100g,
      comparedTo: otherNutrition?.caloriesPer100g,
      category: 'nutrition',
    });
  }

  if (
    isMeaningfullyLower(
      betterNutrition?.caloriesPerServing,
      otherNutrition?.caloriesPerServing,
      MEANINGFUL_DIFF.caloriesPerServing,
    )
  ) {
    facts.push({
      key: 'calories-per-serving',
      label: 'Lower calories per serving',
      value: betterNutrition?.caloriesPerServing,
      comparedTo: otherNutrition?.caloriesPerServing,
      category: 'nutrition',
    });
  }

  const betterAdditives = betterProduct.product?.additives?.length ?? 0;
  const otherAdditives = otherProduct.product?.additives?.length ?? 0;

  if (isMeaningfullyLower(betterAdditives, otherAdditives, MEANINGFUL_DIFF.additivesCount)) {
    facts.push({
      key: 'additives',
      label: 'Fewer additives',
      value: betterAdditives,
      comparedTo: otherAdditives,
      category: 'ingredients',
    });
  }

  const betterIngredients = betterProduct.product?.ingredients?.length ?? 0;
  const otherIngredients = otherProduct.product?.ingredients?.length ?? 0;

  if (isMeaningfullyLower(betterIngredients, otherIngredients, MEANINGFUL_DIFF.ingredientsCount)) {
    facts.push({
      key: 'ingredients',
      label: 'Simpler ingredient list',
      value: betterIngredients,
      comparedTo: otherIngredients,
      category: 'ingredients',
    });
  }

  return facts.slice(0, 8);
}
```

---

### Helper Functions

```ts
const MEANINGFUL_DIFF = {
  proteinPer100g: 1,
  fiberPer100g: 1,
  sugarPer100g: 1,
  fatPer100g: 2,
  saturatedFatPer100g: 1,
  sodiumPer100g: 0.05,
  caloriesPer100g: 20,
  caloriesPerServing: 20,
  additivesCount: 1,
  ingredientsCount: 3,
};

function isMeaningfullyHigher(value?: number | null, comparedTo?: number | null, threshold = 0) {
  if (value == null || comparedTo == null) return false;
  return value - comparedTo >= threshold;
}

function isMeaningfullyLower(value?: number | null, comparedTo?: number | null, threshold = 0) {
  if (value == null || comparedTo == null) return false;
  return comparedTo - value >= threshold;
}
```

---

## UI Behavior

### `winner_found`

Show the winning product as the best fit for this profile.

Show:

- product name;
- image;
- safety status;
- relevant summary;
- `winnerBestAt`;
- `anotherProductMayBeBetterAt`.

Do not show score facts as explanation facts.

---

### `no_suitable_product`

Show that neither product is suitable for this profile.

Do not show a winner.

Recommended copy:

```text
No suitable product for this profile
```

or:

```text
Neither product is recommended for this profile
```

In this state:

```ts
winner = null;
otherProduct = null;
winnerBestAt = [];
anotherProductMayBeBetterAt = [];
```

---

### `equivalent`

Show that both products are very similar for this profile.

Recommended copy:

```text
Both products are similarly suitable for this profile
```

It is okay to still show comparison facts for both products.

---

## Edge Cases

Handle these cases safely:

- Missing `profiles`.
- Missing `analysis`.
- Missing `nutrition`.
- Missing optional nutrition fields.
- Missing `additives`.
- Missing `ingredients`.
- More than two products in response, although current endpoint should return two.
- Profile exists on one product but not the other.
- Both products are unsuitable.
- Products are equivalent.
- One product is suitable and the other is not.
- Both products are suitable but have different strengths.

The utility should not crash if optional fields are missing.

---

## Acceptance Criteria

- Frontend can process the existing compare endpoint response.
- Products are grouped by `profileId`.
- Each profile gets its own comparison result.
- If both products are unsuitable, `status` is `no_suitable_product`.
- If both products are unsuitable, no winner is selected.
- The algorithm must not choose a “least bad” winner.
- If one product is better, it is returned as `winner`.
- If products are very close, `status` is `equivalent`.
- `winnerBestAt` is generated for the winning product.
- `anotherProductMayBeBetterAt` is generated for the other product.
- Each fact array contains no more than 8 facts.
- Facts do not mention overall score, goal fit score, or nutrition score.
- Facts are practical and user-facing.
- Facts may describe either higher or lower advantages depending on the metric.
- Safety has higher priority than nutrition when selecting a winner.
- Existing compare response structure is supported without backend changes.
- Logic is covered with unit tests.

---

## Test Cases

DONT CREATE TEST CASES FOR THIS TASK.
