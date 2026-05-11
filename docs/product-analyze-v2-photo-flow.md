# Product Analysis — Photo Flow

This document explains the customer-facing flow for analyzing a food or drink product from a photo: what happens step by step, where ingredients come from, and how the final recommendation is calculated.

## Quick summary

When a user takes or uploads a product photo, the app reads the visible packaging, identifies the product, collects available ingredient and nutrition information, checks it against the user's profile, and returns a clear recommendation for each person.

The goal is simple: help the user understand whether the product is safe and suitable for their allergies, restrictions, and health goal.

## Full flow

```text
User takes or uploads a product photo
  -> The app checks that the photo is usable
  -> The label text is read from the image
  -> The product name and brand are identified
  -> Product details are collected from the visible label and available product information
  -> Ingredients, allergens, traces, additives, and nutrition facts are organized
  -> The product is checked against the user's profile
  -> Scores are calculated
  -> The user receives a recommendation and reasons
```

## 1. The user takes or uploads a product photo

The user can take a new photo or upload an existing image of a packaged food or drink.

A good photo should ideally show:

- product name;
- brand;
- ingredients list;
- allergy warnings;
- nutrition facts;
- any “may contain” or trace warnings.

The more readable the package is, the better the result will be.

## 2. The app reads the product label

The app reads visible text from the photo.

It looks for important product information such as:

- product name;
- brand;
- ingredients;
- nutrition facts;
- serving information;
- allergen warnings;
- trace or “may contain” warnings;
- labels or claims on the package.

The app does not translate or rewrite the label at this stage. It first tries to capture what is actually visible on the packaging.

## 3. The app checks whether it is a food or drink product

The photo must clearly show a human food or beverage product.

If the image looks like a non-food item, a supplement, medicine, pet food, menu, receipt, shelf, or something too unclear, the app should not treat it as a normal food product.

## 4. The product is identified

After reading the label, the app uses the visible clues to identify the most likely product.

The strongest clues are:

- product name;
- brand;
- package text;
- nutrition panel;
- ingredients list;
- product claims or category words.

The app tries to match the exact product variant, not just a similar product from the same brand.

For example, “Brand A Protein Bar Chocolate” and “Brand A Protein Bar Peanut Butter” should be treated as different products because ingredients and allergens may differ.

## 5. How ingredients are collected

For photo analysis, ingredients can come from two customer-visible sources.

### Source 1: text visible on the photo

If the ingredients list is readable in the photo, the app reads it from the packaging.

This is the most direct source because it comes from the user's actual product image.

### Source 2: available product information

If the product can be identified, the app may also use available product information for the same product, such as known ingredients, nutrition facts, allergens, traces, and additives.

This helps when:

- the photo shows the front of the package but not the full ingredient list;
- nutrition details are not fully visible;
- the label is partially cut off;
- the product name and brand are clear enough to find more product details.

## 6. What the app does not do with ingredients

The app should not invent missing ingredients.

If ingredients are not visible and reliable product information is not available, the ingredient list may be incomplete or empty.

The app also separates different kinds of product information:

- **Ingredients** — what the product is made from.
- **Allergens** — declared allergen information.
- **Traces** — “may contain” or cross-contamination warnings.
- **Additives** — listed additives or additive codes.
- **Nutrition** — calories, protein, sugar, fat, fiber, sodium, and similar facts.

This separation matters because a direct ingredient is treated differently from a trace warning.

## 7. Ingredients may be translated for analysis

If the ingredient list is in another language, the app may translate ingredient names to English for more consistent analysis.

The purpose is to better compare ingredients against allergies and dietary restrictions.

The original ingredient meaning should be preserved. The app should not add extra ingredients during translation.

## 8. The product is checked against the user's profile

The app checks the product separately for each relevant person.

For each profile, it considers:

- allergies;
- dietary restrictions;
- custom allergy notes;
- main health goal;
- family member profiles, when family analysis is enabled.

Each person can receive a different result for the same product.

For example:

- one person may be fine with dairy;
- another person may have a dairy allergy;
- another person may be focused on weight loss;
- another person may be trying to increase protein.

So the recommendation is personalized, not one-size-fits-all.

## 9. How the safety score is calculated

Safety is the first and most important check.

The app looks for:

- direct matches with selected allergies;
- direct conflicts with selected dietary restrictions;
- trace warnings that may matter for the profile;
- high carbohydrate content for keto restrictions;
- additive concerns.

Important safety behavior:

- If the product contains a confirmed allergen selected by the user, the recommendation becomes **avoid**.
- If the product clearly violates a selected restriction, the recommendation becomes **avoid**.
- If the product has a relevant “may contain” warning, the recommendation becomes **warning** or **use with caution**.
- If the information is unclear, the app should be cautious rather than overly confident.

Safety can override a good nutrition score. A nutritionally strong product is still not suitable if it conflicts with the user's allergy or restriction.

## 10. How the nutrition score is calculated

The nutrition score measures the general nutrition quality of the product.

The app looks at facts such as:

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

Not every product is judged the same way.

For example:

- water is judged mostly by sugar, calories, sodium, and additives;
- sweet snacks are judged strongly on sugar, calories, saturated fat, and additives;
- savory snacks are judged strongly on sodium, calories, additives, protein, and fiber;
- oils are judged more by fat quality and ingredient simplicity.

This makes the score more fair because different product types have different nutrition expectations.

## 11. How the goal-fit score is calculated

Goal-fit measures how well the product matches the user's health goal.

Examples:

- For weight loss, lower calories, lower sugar, good protein, and good fiber may matter more.
- For muscle gain, protein may matter more.
- For general health, the app balances sugar, fiber, sodium, saturated fat, additives, and calories.

Goal-fit is personal. Two users can scan the same product and receive different goal-fit results.

## 12. How the overall score is calculated

The overall result is built from three sub-scores. Each sub-score uses a **0–100** scale, where a higher number is better.

The three sub-scores are:

1. **Safety** — does the product conflict with allergies or restrictions?
2. **Nutrition** — how good is the product nutritionally for its type?
3. **Goal fit** — how well does it match the user's goal?

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

This is why the same product can receive different results for different people.

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
- a product with poor nutrition may be capped even if it has no allergy issue;
- a product that fits the user's goal can score better than a similar product that does not.

## 13. What the user sees

The user receives:

- product name and brand when available;
- ingredients when available;
- allergen and trace information when available;
- nutrition facts when available;
- a score and rating;
- positive reasons;
- negative reasons;
- a simple “can I have this?” style answer;
- separate results for family members when enabled.

The result should help the user quickly understand:

- whether the product is safe;
- whether it fits their restrictions;
- whether it supports their goal;
- what to watch out for.

## 14. When photo results may be limited

Photo analysis depends heavily on image quality and visible packaging.

Results may be limited when:

- the photo is blurry;
- the ingredients are not visible;
- the nutrition label is hidden;
- the package is folded or cut off;
- the product name or brand is unclear;
- the product cannot be confidently identified;
- available product information is incomplete.

In these cases, the app should avoid guessing and may return less detail.

## 15. Customer-friendly takeaway

Photo analysis works like this:

1. Read the package.
2. Identify the product.
3. Collect only available ingredient and nutrition facts.
4. Compare the product with the user's profile.
5. Calculate safety, nutrition, and goal fit.
6. Return a clear recommendation with reasons.

The most important principle: the app should not invent missing product data. If information is not visible or reliably available, the result should be cautious.
