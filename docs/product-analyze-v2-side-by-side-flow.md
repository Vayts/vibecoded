# How Barcode and Photo Product Analysis Works

This document explains the full process in a customer-friendly way: what happens when a user scans a barcode, what happens when a user takes a product photo, where ingredients come from, and how the final score is calculated.

Both flows answer the same question: **is this product a good choice for this person?**

They use different ways to collect product information, but once the product facts are collected, the recommendation logic is the same.

|                      | Barcode scan                                  | Photo analysis                                                                        |
| -------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------- |
| What the user does   | Scans the barcode on a packaged food or drink | Takes or uploads a photo of the package                                               |
| Best for             | Products that have reliable barcode data      | Products where the label is visible and readable                                      |
| Main provider/source | **Open Food Facts** product data              | The visible label plus **Tavily** search results when more product details are needed |
| Ingredient source    | Product details linked to the barcode         | Text visible on the package and matching public product information                   |
| Final result         | Personalized score and recommendation         | Personalized score and recommendation                                                 |

## Barcode flow

With barcode analysis, the barcode is used to find the product in **Open Food Facts**.

Open Food Facts is a public food product database. It can provide information such as product name, brand, ingredients, allergens, traces, additives, nutrition facts, serving size, category, and product images.

The barcode flow is usually faster because the app does not need to read the package visually. It simply uses the barcode to look for known product information.

The process is:

1. The user scans a barcode.
2. The app looks for product information in Open Food Facts.
3. If product information is available, the app collects the product facts.
4. Ingredients, allergens, traces, additives, and nutrition facts are kept separate.
5. The product is checked against the user's profile.
6. The app calculates safety, nutrition, goal fit, and the final recommendation.

If the same product was already analyzed recently and the user's preferences have not changed, the app may reuse the previous result to make the experience faster.

## Photo flow

With photo analysis, the app starts from the user's actual package photo.

First, the app reads the visible text on the package. This can include the product name, brand, ingredients, allergen warnings, nutrition facts, serving information, and other label text.

Then, if the product can be identified, the app may use **Tavily** to search for matching public product information. Tavily helps find product details from public sources when the photo does not show everything clearly.

The photo flow is useful when:

- the barcode is not available;
- barcode data is incomplete;
- the user wants to analyze the actual package in front of them;
- the label clearly shows ingredients or nutrition facts.

The process is:

1. The user takes or uploads a photo.
2. The app reads visible package text.
3. The app identifies the most likely product and brand.
4. If needed, Tavily helps find matching product details from public sources.
5. The app collects available ingredients, allergens, traces, additives, and nutrition facts.
6. The product is checked against the user's profile.
7. The app calculates safety, nutrition, goal fit, and the final recommendation.

Photo results depend heavily on image quality. A clear photo of the ingredients and nutrition label gives a better result than a blurry photo of only the front of the package.

## How ingredients are collected

For barcode analysis, ingredients usually come from **Open Food Facts**. If Open Food Facts has the ingredient list for that barcode, the app uses it. If the product record does not include ingredients, the app should not invent them.

For photo analysis, ingredients can come from two places. The first source is the text visible in the user's photo. If the ingredient list is readable, the app can use it directly. The second source is matching public product information found with Tavily, when the product can be identified confidently enough.

In both flows, the app keeps different product facts separate:

- **Ingredients** are what the product is made from.
- **Allergens** are declared allergy warnings.
- **Traces** are “may contain” or cross-contamination warnings.
- **Additives** are listed additives or additive codes.
- **Nutrition facts** include calories, protein, sugar, fat, fiber, sodium, and similar values.

This matters because each type of information affects the recommendation differently. Milk listed as a direct ingredient is stronger than “may contain milk.” Sugar affects nutrition and goal fit, but it is not automatically an allergy issue. Additives can affect the nutrition score even when they are not a direct safety concern.

The most important rule is: **missing product data is not guessed**. If ingredients or nutrition facts are unavailable, the result should be more cautious instead of pretending the information is known.

## How the user's profile is used

Barcode and photo analysis both check the product against the user's profile.

The app considers allergies, dietary restrictions, custom allergy notes, the user's main health goal, and family member profiles when family analysis is enabled.

The same product can produce different results for different people. For example, a product may be fine for one person, unsafe for someone with a peanut allergy, and a poor goal fit for someone focused on weight loss.

## How scores are calculated

Both barcode and photo use the same scoring logic after product facts have been collected.

Each product receives three sub-scores from **0 to 100**, where a higher number is better:

- **Safety score** — checks allergy, restriction, trace, and caution risks.
- **Nutrition score** — checks nutrition quality for this type of product.
- **Goal-fit score** — checks how well the product supports the person's selected goal.

The final overall score is a weighted mix of those three scores:

- **Safety: 10%**
- **Goal fit: 20%**
- **Nutrition: 70%**

In simple terms:

```text
Overall score = Safety part + Goal-fit part + Nutrition part
```

Nutrition has the biggest impact on the number, but safety still protects the recommendation.

### Safety score calculation

Safety starts at **100**.

Then the app lowers the score or changes the recommendation when it finds a risk for that person's profile.

The main rules are:

- **Confirmed selected allergen**: score becomes **0**, recommendation becomes **avoid**.
- **Clear dietary restriction conflict**: score can become **0**, recommendation becomes **avoid**.
- **Relevant “may contain” / trace allergen warning**: safety is reduced by about **50 points**, recommendation becomes cautious unless there is already a stronger avoid reason.
- **Relevant trace warning for a restriction**: safety is limited to about **40**.
- **Partly compatible restriction**: safety is also limited to about **40**.
- **Unclear restriction or certification concern**: recommendation becomes more cautious.
- **Keto restriction with more than 20g carbohydrates per 100g**: treated as a clear conflict and can become **avoid**.
- **Additives**: one or two additives reduce safety by about **10 points**; three or more additives reduce it by about **20 points**.

This means safety can override the final result. A product can look good nutritionally but still be a bad recommendation for someone with a relevant allergy or restriction.

### Nutrition score calculation

Nutrition is also scored from **0 to 100**.

The app turns available nutrition facts into smaller nutrition checks, then combines them into one nutrition score.

Examples of nutrition checks:

- **Protein**: higher is better.
- **Fiber**: higher is better.
- **Sugar**: lower is better.
- **Sodium**: lower is better.
- **Saturated fat**: lower is better.
- **Calories / calorie density**: lower is usually better, depending on the product type.
- **Calories per serving**: lower is usually better, especially for snacks and drinks.
- **Additives**: fewer is better.
- **Ingredient simplicity**: shorter, simpler ingredient lists score better.
- **Fat quality**: for oils and fatty products, a better fat profile can improve the score.

The product type changes what matters most:

- **Drinks** focus more on sugar, calories, sodium, and additives.
- **Sweet snacks** focus more on sugar, calories, saturated fat, and additives.
- **Savory snacks** focus more on sodium, calories, additives, protein, and fiber.
- **Oils** focus more on fat quality and ingredient simplicity.
- **Protein products** focus more on protein, calories, sugar, sodium, and additives.

Missing nutrition facts are not guessed. If a fact is missing, it cannot help the score. If too much information is missing, the result becomes less confident and may be more cautious.

### Goal-fit score calculation

Goal fit is also scored from **0 to 100**.

This score answers: **does this product support this person's goal?**

The app weighs nutrition facts differently depending on the selected goal:

- **Weight loss**: calories, sugar, fiber, and protein matter more.
- **Muscle gain**: protein matters more, while calories and sugar are still considered.
- **General health**: the app balances sugar, fiber, sodium, saturated fat, calories, additives, and overall nutrition quality.

The product type still matters. For example, a high-protein snack and a cooking oil are not judged against the same goal-fit expectations.

### Final caps and rating

After the weighted overall score is calculated, the app can limit the final result if there is a serious concern.

Nutrition caps:

- If nutrition is below **35**, the final score is capped around **42**.
- If nutrition is below **45**, the final score is capped around **50**.
- If nutrition is below **55**, the final score is capped around **58**.

Safety cap:

- If safety is below **30**, the final score is capped around **30**.

Rating guide:

- **90–100**: excellent.
- **75–89**: good choice.
- **60–74**: okay.
- **35–59**: use with caution.
- **0–34**: avoid.

If the safety status is **avoid**, the final recommendation is **avoid** even if the numeric score from other areas would otherwise look better.

## What the user sees

The user receives a practical result, not just raw data.

The result may include the product name, brand, ingredients, allergen and trace warnings, nutrition facts, score, rating, positive reasons, negative reasons, and a simple recommendation such as whether the product is okay, should be used with caution, or should be avoided.

If family profiles are enabled, each family member can receive a separate recommendation.

## Simple takeaway

Barcode and photo are two ways to collect product facts.

Barcode analysis mainly relies on **Open Food Facts**. Photo analysis starts from the visible package label and may use **Tavily** to find matching public product details.

After that, both flows work the same way: collect available facts, do not invent missing data, compare the product with the user's profile, calculate safety, nutrition, and goal fit, then return a clear personalized recommendation.
