# Task: Add `compare` Endpoint to `product-analyze-v2`

## Context

The `product-analyze-v2` module already supports analyzing a single product by barcode.

We need to add a new `compare` endpoint that accepts two product barcodes, retrieves both products from Open Food Facts when needed, analyzes them using the existing product analysis logic, and returns both analyzed products to the frontend.

The comparison flow must reuse existing product analysis results when possible and must analyze both products in parallel.

Important requirements:

- The endpoint must accept exactly two barcodes.
- Both products must be processed in parallel.
- The compare flow must be implemented as a single LangGraph node.
- Existing product analysis logic must be reused, not duplicated.
- If the user already has a valid existing analysis for a product, the system must reuse it instead of calling Open Food Facts and analyzing the product again.

---

## Goal

Add a new endpoint to `product-analyze-v2`:

```http
POST /product-analyze-v2/compare
```

The endpoint should return two analyzed products in a format compatible with the frontend.

---

## Request Body

Use the DTO format that best matches the existing style in `product-analyze-v2`.

Recommended format:

```ts
{
  "barcodeA": "string",
  "barcodeB": "string"
}
```

Alternative format, only if the project commonly uses arrays for this type of input:

```ts
{
  "barcodes": ["string", "string"]
}
```

The implementation should follow the existing project conventions.

---

## Response

The endpoint should return both analyzed products.

Expected response shape:

```ts
{
  "products": [
    {
      "barcode": "string",
      "product": {},
      "analysis": {}
    },
    {
      "barcode": "string",
      "product": {},
      "analysis": {}
    }
  ]
}
```

If the existing single-product analysis endpoint returns a different response structure, reuse that same structure for each product inside the `products` array.

---

## Functional Requirements

### 1. Add a New Compare Endpoint

Add a new controller method in the `product-analyze-v2` module.

Example:

```ts
@Post('compare')
async compareProducts(
  @Body() dto: CompareProductsDto,
  @CurrentUser() user: User,
) {
  return this.productAnalyzeV2Service.compareProducts(dto, user);
}
```

Adapt decorators, user injection, DTO names, and service names to the existing project conventions.

---

### 2. Add Request Validation

Create a DTO for the compare request.

Validation requirements:

- Exactly two barcodes must be provided.
- Each barcode must be a non-empty string.
- Barcodes should be trimmed before processing.
- If both barcodes are the same, return a validation error unless the existing product analysis behavior suggests otherwise.

Recommended validation behavior:

```ts
if (barcodeA === barcodeB) {
  throw new BadRequestException('Products for comparison must be different');
}
```

---

### 3. Reuse Existing Analysis When Possible

Before calling Open Food Facts for a barcode, check if the current user already has an existing analysis for that product.

If the existing analysis was created after the user's latest preference update, reuse it.

The freshness condition should be:

```ts
existingAnalysis.created_at > user.analysis_preferences_updated_at;
```

If the project uses another timestamp field for product analysis freshness, such as `updated_at` or `analyzed_at`, use the correct existing field.

If `user.analysis_preferences_updated_at` is `null`, the existing analysis can be treated as valid.

Expected behavior:

- If a valid existing analysis exists:
  - Do not call Open Food Facts.
  - Do not run product analysis again.
  - Return the existing analyzed product response.
- If no valid existing analysis exists:
  - Fetch the product from Open Food Facts.
  - Analyze it using the existing product analysis logic.
  - Save the new analysis if the current flow already does so.
  - Return the analyzed product response.

---

### 4. Process Both Products in Parallel

Both products must be processed concurrently.

Use `Promise.all` or an equivalent parallel execution mechanism.

Expected pattern:

```ts
const [productA, productB] = await Promise.all([
  getOrAnalyzeProductByBarcode({ barcode: barcodeA, user }),
  getOrAnalyzeProductByBarcode({ barcode: barcodeB, user }),
]);
```

Avoid sequential processing:

```ts
const productA = await getOrAnalyzeProductByBarcode({ barcode: barcodeA, user });
const productB = await getOrAnalyzeProductByBarcode({ barcode: barcodeB, user });
```

---

### 5. Use Existing Product Analysis Logic

Do not duplicate the current single-product analysis logic.

If the current logic is tightly coupled to the existing endpoint or LangGraph flow, extract a reusable function or service method.

Suggested reusable method:

```ts
async getOrAnalyzeProductByBarcode({
  barcode,
  user,
}: {
  barcode: string;
  user: User;
}) {
  // 1. Check existing analysis
  // 2. Reuse it if it is still valid
  // 3. Otherwise fetch from Open Food Facts
  // 4. Run existing product analysis logic
  // 5. Return frontend-compatible analyzed product response
}
```

This helper should be used by both the existing single-product flow, if appropriate, and the new compare flow.

---

## LangGraph Requirements

The compare flow must be implemented as a single LangGraph node.

Do not create separate LangGraph nodes for each barcode.

Correct approach:

```ts
compareProductsNode;
```

Inside this single node, process both products in parallel.

Example:

```ts
const compareProductsNode = async (state: CompareProductsState) => {
  const { barcodeA, barcodeB, user } = state;

  const [productA, productB] = await Promise.all([
    getOrAnalyzeProductByBarcode({ barcode: barcodeA, user }),
    getOrAnalyzeProductByBarcode({ barcode: barcodeB, user }),
  ]);

  return {
    products: [productA, productB],
  };
};
```

The graph should contain one compare node responsible for the whole compare operation.

---

## Suggested Implementation Structure

### DTO

```ts
export class CompareProductsDto {
  barcodeA: string;
  barcodeB: string;
}
```

Add validation decorators based on the project's validation approach.

Example:

```ts
export class CompareProductsDto {
  @IsString()
  @IsNotEmpty()
  barcodeA: string;

  @IsString()
  @IsNotEmpty()
  barcodeB: string;
}
```

---

### Controller

```ts
@Post('compare')
async compareProducts(
  @Body() dto: CompareProductsDto,
  @CurrentUser() user: User,
) {
  return this.productAnalyzeV2Service.compareProducts(dto, user);
}
```

---

### Service

```ts
async compareProducts(dto: CompareProductsDto, user: User) {
  const barcodeA = dto.barcodeA.trim();
  const barcodeB = dto.barcodeB.trim();

  if (barcodeA === barcodeB) {
    throw new BadRequestException('Products for comparison must be different');
  }

  return this.productAnalyzeV2Graph.invoke({
    barcodeA,
    barcodeB,
    user,
  });
}
```

---

### LangGraph Node

```ts
async compareProductsNode(state: CompareProductsState) {
  const [productA, productB] = await Promise.all([
    this.getOrAnalyzeProductByBarcode({
      barcode: state.barcodeA,
      user: state.user,
    }),
    this.getOrAnalyzeProductByBarcode({
      barcode: state.barcodeB,
      user: state.user,
    }),
  ]);

  return {
    products: [productA, productB],
  };
}
```

---

### Reusable Product Helper

```ts
async getOrAnalyzeProductByBarcode({
  barcode,
  user,
}: {
  barcode: string;
  user: User;
}) {
  const existingAnalysis =
    await this.productAnalysisRepository.findLatestByUserAndBarcode({
      userId: user.id,
      barcode,
    });

  const preferencesUpdatedAt = user.analysis_preferences_updated_at;

  const canReuseExistingAnalysis =
    existingAnalysis &&
    (!preferencesUpdatedAt ||
      existingAnalysis.created_at > preferencesUpdatedAt);

  if (canReuseExistingAnalysis) {
    return this.mapAnalysisToProductResponse(existingAnalysis);
  }

  const offProduct = await this.openFoodFactsService.getProductByBarcode(barcode);

  const analyzedProduct = await this.analyzeProductUsingExistingLogic({
    product: offProduct,
    barcode,
    user,
  });

  return analyzedProduct;
}
```

Use the actual existing repository, service, mapper, and analysis method names from the project.

---

## Error Handling

The endpoint should handle the same errors as the existing product analysis flow.

Required cases:

- Invalid barcode.
- Product not found in Open Food Facts.
- Open Food Facts request failed.
- Product analysis failed.
- User is unauthorized or not found.
- Existing cached analysis is invalid or stale.

Unless the project already supports partial success responses, if one of the two products fails, the whole compare request should fail.

---

## Testing Requirements

DO NOT CREATE ANY SPEC OT TEST FILE.

### Parallel Processing

- Ensure both product operations are started in parallel.
- The implementation should use `Promise.all` or equivalent parallel behavior.

### Reuse Existing Analysis

- Given a product with an existing analysis where:

```ts
existingAnalysis.created_at > user.analysis_preferences_updated_at;
```

- The system should not call Open Food Facts for that product.
- The system should not analyze that product again.
- The existing analysis should be returned.

### Re-analyze After Preference Update

- Given a product with an existing analysis where:

```ts
existingAnalysis.created_at <= user.analysis_preferences_updated_at;
```

- The system should call Open Food Facts.
- The system should analyze the product again.
- The new analysis should be returned.

### Null Preferences Updated At

- Given `user.analysis_preferences_updated_at` is `null`.
- Existing analysis should be considered valid.
- Open Food Facts should not be called if an existing analysis exists.

### One Product Fails

- Given one product succeeds and the other fails.
- The endpoint should return an error for the whole compare request unless partial success is already supported by the project.

### Duplicate Barcodes

- Given both barcodes are the same.
- The endpoint should return a validation error, unless project requirements say duplicate products are allowed.

---

## Acceptance Criteria

- `POST /product-analyze-v2/compare` endpoint is added.
- Endpoint accepts exactly two barcodes.
- Request body is validated.
- Products are processed in parallel.
- Compare flow is implemented as one LangGraph node.
- Existing product analysis logic is reused.
- Existing valid analysis is reused when it was created after `user.analysis_preferences_updated_at`.
- If `user.analysis_preferences_updated_at` is `null`, existing analysis is considered valid.
- Open Food Facts is not called for products with valid existing analysis.
- Products with stale or missing analysis are fetched from Open Food Facts and analyzed.
- Response contains two frontend-compatible analyzed products.
- Tests cover successful compare, cache reuse, stale analysis, null preference update timestamp, parallel execution, duplicate barcodes, and failure behavior.

---

## Notes

Pay special attention to the timestamp used for the freshness check.

The requirement mentions:

```ts
user.analysis_preferences_updated_at;
```

The existing analysis timestamp may be named differently in the project, for example:

- `created_at`
- `updated_at`
- `analyzed_at`

Use the timestamp that correctly represents when the product analysis was generated.

The compare graph must not have two separate LangGraph nodes for the two products. Parallel execution must happen inside a single compare node.
