# TASKS.md

Task tracker for the AI flashcard app. Work top to bottom. One task at a time.

**Statuses:** `todo` | `in-progress` | `blocked` | `done`

## Task: Add “Scan to Compare” flow

STATUS: in-progress

Currently, when the user taps **Compare** from the product context menu, they can only compare the selected product with products from their scan history.

We need to add a second comparison option:

### New option

Add a new button/action:

**Scan to Compare**

This action should open the camera in a dedicated **comparison mode**.

### Expected flow

1. User opens the context menu for a product.
2. User taps **Compare**.
3. Comparison options should include:
  - Compare with history product
  - Scan to Compare
4. If the user taps **Scan to Compare**:
  - Open the camera/scanner screen.
  - The original product should already be selected as the first comparison product.
  - The scanner should work in comparison mode.
  - User only needs to scan a barcode or take a photo of the second product.
5. After the second product is analyzed, open the comparison result UI using:
  - first product = product selected from context menu
  - second product = newly scanned/analyzed product

### Important requirements

- Do not break the existing “compare with history” flow.
- Comparison mode should be explicit in navigation/state, not inferred from random global state.
- Camera screen should understand that it was opened for comparison and should return/continue directly to comparison result after scan analysis.
- The first product must remain preserved during the whole scan/analyze flow.
- Handle both barcode scan and photo analysis.
- Add proper loading/error handling if the second product analysis fails.
- If the user cancels camera scanning, they should return back without losing the original product context.

### Acceptance criteria

- User can still compare a product with products from scan history.
- User can tap **Scan to Compare** from the compare flow.
- Camera opens with the selected product already stored as the first comparison item.
- User can scan or photograph another product.
- After successful analysis, comparison result opens automatically.
- Cancel/back behavior works correctly.
- No regressions in normal scan mode.
