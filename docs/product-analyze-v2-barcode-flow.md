# Product Analysis — Barcode Flow

This document explains the customer-facing flow for analyzing a food or drink product from a barcode scan: what happens step by step, where ingredients come from, and how the final recommendation is calculated.

## Quick summary

When a user scans a barcode, the app looks up the product connected to that barcode, collects available product information, checks ingredients and nutrition against the user's profile, and returns a personalized recommendation.

The goal is to help the user quickly decide whether the product is safe, suitable, and aligned with their health goal.

## Full flow

```text
User scans a barcode
  -> The app finds the product connected to that barcode
  -> Available product details are collected
  -> Ingredients, allergens, traces, additives, and nutrition facts are organized
  -> The product is checked against the user's profile
  -> Scores are calculated
  -> The user receives a recommendation and reasons
```

## 1. The user scans a barcode

The user scans the barcode on a packaged food or drink.

The barcode is used as the product identifier. It helps the app find the correct product information more directly than a photo.

Barcode analysis usually works best for packaged products that already have known product data.

## 2. The app finds the product

After the barcode is scanned, the app looks for product information connected to that barcode.

The product information may include:

- product name;
- brand;
- product image;
- ingredients;
- allergen declarations;
- trace or “may contain” warnings;
- additives;
- nutrition facts;
- serving size;
- product category.

If the same product was already analyzed recently for the same user and the user's preferences have not changed, the app may reuse the previous result so the user gets a faster response.

## 3. How ingredients are collected

For barcode analysis, ingredients come from known product information linked to the barcode.

This means the app is not reading the physical label from a photo. Instead, it uses product data associated with the scanned barcode.

The ingredient-related information is organized into separate groups:

- **Ingredients** — the actual ingredient list when available.
- **Allergens** — declared allergens for the product.
- **Traces** — “may contain” or cross-contamination warnings.
- **Additives** — listed additives or additive codes.
- **Nutrition** — calories, protein, sugar, fat, fiber, sodium, and similar facts.

These groups are kept separate because they affect recommendations differently.

For example:

- milk listed as a direct ingredient is stronger than a “may contain milk” trace warning;
- an additive can affect nutrition quality but may not be an allergy issue;
- sugar affects nutrition and goal-fit, but not necessarily safety.

## 4. What happens if product data is missing

The app should not invent missing product details.

If the barcode product has no ingredient list, the ingredients may be shown as unavailable.

If nutrition facts are incomplete, the app calculates scores using the facts that are available and treats missing information carefully.

If there is not enough useful product information at all, the app may not be able to provide a reliable analysis.

## 5. Ingredients may be translated for analysis

Some products have ingredient lists in different languages.

When needed, the app may translate ingredient names to English before checking them against allergies and restrictions.

The purpose is consistency. The app should preserve the original meaning and should not add ingredients that were not present in the product information.

## 6. The product is checked against the user's profile

The app analyzes the product separately for each relevant person.

For each profile, it considers:

- allergies;
- dietary restrictions;
- custom allergy notes;
- main health goal;
- family member profiles, when family analysis is enabled.

The same product can have different recommendations for different people.

For example:

- it may be safe for one person but not safe for someone with a peanut allergy;
- it may fit one person's muscle gain goal but not another person's weight loss goal;
- it may be acceptable for someone without restrictions but unsuitable for someone avoiding dairy or gluten.

## 7. How the safety score is calculated

Safety is the first and most important part of the recommendation.

The app checks whether the product conflicts with the person's profile.

It looks for:

- selected allergens in the ingredient list;
- selected allergens in declared allergen information;
- relevant “may contain” or trace warnings;
- conflicts with selected dietary restrictions;
- high carbohydrate content for keto restrictions;
- additive concerns.

Important safety behavior:

- If a selected allergen is clearly present, the product should be marked **avoid**.
- If a selected dietary restriction is clearly violated, the product should be marked **avoid**.
- If there is a relevant trace warning, the product should be marked as a **warning** or **use with caution**.
- If information is unclear, the recommendation should be cautious instead of pretending certainty.

Safety can override other scores. A product can have good nutrition but still be unsuitable for someone with a relevant allergy or restriction.

## 8. How the nutrition score is calculated

The nutrition score measures the general nutrition quality of the product.

The app considers nutrition facts such as:

- calories;
- protein;
- fiber;
- sugar;
- sodium;
- saturated fat;
- fat quality;
- additives;
- ingredient simplicity;
- serving size when available.

The app does not judge every product type the same way.

For example:

- water is mainly judged by sugar, calories, sodium, and additives;
- sweet snacks are judged strongly on sugar, calories, saturated fat, and additives;
- savory snacks are judged strongly on sodium, calories, additives, protein, and fiber;
- oils are judged more by fat quality and ingredient simplicity.

This makes the scoring more fair because a snack, drink, oil, and protein product should not all be measured by the exact same expectations.

## 9. How the goal-fit score is calculated

Goal-fit measures how well the product supports the person's selected health goal.

Examples:

- For weight loss, lower calories, lower sugar, good fiber, and good protein may improve the result.
- For muscle gain, higher protein may improve the result.
- For general health, the app balances sugar, fiber, sodium, saturated fat, additives, and calories.

Goal-fit is personal. The same barcode can produce different goal-fit results for different users.

## 10. How the overall score is calculated

The final recommendation is built from three sub-scores. Each sub-score uses a **0–100** scale, where a higher number is better.

The three sub-scores are:

1. **Safety** — does the product conflict with allergies or restrictions?
2. **Nutrition** — how good is the product nutritionally for its type?
3. **Goal fit** — how well does the product match the person's health goal?

### Safety score

Safety starts from **100** and is reduced when the product creates a risk for that person's profile.

Examples:

- a confirmed selected allergen can make the product **avoid**;
- a clear dietary restriction conflict can make the product **avoid**;
- a relevant “may contain” warning can make the product **warning** or **use with caution**;
- unclear or incomplete safety information can make the result more cautious.

Safety is the strongest protection layer. If something is unsafe for the user, the app should not recommend it just because the nutrition looks good.

### Nutrition score

Nutrition is also scored from **0–100**.

The app looks at available nutrition facts such as calories, protein, fiber, sugar, sodium, saturated fat, fat quality, additives, ingredient simplicity, and serving size.

The product is judged according to what it is. A drink, snack, oil, and protein product are not scored by the exact same expectations.

If some nutrition facts are missing, the app uses the facts that are available and avoids guessing the missing ones.

### Goal-fit score

Goal fit is scored from **0–100** and depends on the person's selected health goal.

Examples:

- for weight loss, calories, sugar, fiber, and protein may matter more;
- for muscle gain, protein may matter more;
- for general health, the app balances overall nutrition quality.

This is why the same barcode can receive different results for different people.

### Final overall score

The overall score combines the three sub-scores like this:

- **Safety: 10%**
- **Goal fit: 20%**
- **Nutrition: 70%**

In simple terms:

```text
Overall score = Safety part + Goal-fit part + Nutrition part
```

Nutrition has the largest influence on the numeric score, but the final recommendation is not based on nutrition alone. Safety and very poor nutrition can limit the final result.

That means:

- a product with an allergen conflict should not receive a strong recommendation;
- a product with poor nutrition may be limited even if it has no allergy issue;
- a product that fits the user's goal can score better than a similar product that does not.

## 11. What the user sees

The user receives a clear result with:

- product name and brand when available;
- ingredients when available;
- allergen and trace information when available;
- nutrition facts when available;
- a score and rating;
- positive reasons;
- negative reasons;
- a simple “can I have this?” style answer;
- separate results for family members when enabled.

The result is meant to answer practical questions:

- Is this safe for me?
- Does it conflict with my restrictions?
- Is it nutritionally reasonable?
- Does it fit my goal?
- What should I watch out for?

## 12. Why two scans can produce different results

Two scans of the same barcode may produce different results if:

- the user changes allergies, restrictions, or goals;
- family members are added or updated;
- product information becomes more complete or more accurate;
- the product formula changes;
- previous analysis is no longer appropriate for the user's updated profile.

This is expected because the result is personalized and depends on both product data and user profile data.

## 13. When barcode results may be limited

Barcode analysis depends on the quality and completeness of available product information.

Results may be limited when:

- the barcode is not found;
- the product has no ingredient list;
- nutrition facts are missing;
- allergen or trace information is incomplete;
- the product data is outdated;
- the barcode points to a broad product family instead of the exact variant.

In these cases, the app should avoid guessing and may return less detail or a more cautious recommendation.

## 14. Customer-friendly takeaway

Barcode analysis works like this:

1. Scan the barcode.
2. Find the matching product information.
3. Collect only available ingredient and nutrition facts.
4. Compare the product with the user's profile.
5. Calculate safety, nutrition, and goal fit.
6. Return a clear recommendation with reasons.

The most important principle: the app should not invent missing product data. If product information is incomplete, the result should be cautious.
