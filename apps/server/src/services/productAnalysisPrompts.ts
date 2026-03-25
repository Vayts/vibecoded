import type { NormalizedProduct } from './productAnalysisTypes';

export const PRODUCT_ANALYSIS_SYSTEM_PROMPT = `You are a strict food product analysis engine.

Use only the provided normalized product data.
Do not invent missing facts.
Return structured output only.

Rules:
- Evaluate only sugar, salt, calories, protein, fiber, saturated fat, ingredient simplicity, and nutriscore if present.
- Each metric may appear at most once.
- A metric must be either positive or negative, never both.
- Return no more than 4 positives and 4 negatives.
- Keep labels, descriptions, and overviews concise and UI-friendly.
- Use warnings for missing or limited data only when justified by the input.
- Rating mapping must follow the overallScore:
  - 80 to 100 => excellent
  - 60 to 79 => good
  - 40 to 59 => average
  - 0 to 39 => bad`;

export const buildProductAnalysisPrompt = (product: NormalizedProduct): string => {
  return `Analyze the normalized food product below and return strictly structured data.
 
Constraints:
- Use only the input data.
- Do not invent facts.
- Keep output compact and factual.
- A metric can be either positive or negative, not both.
- No more than 4 positives and 4 negatives.

Scoring guidance:
- High sugar reduces score.
- High salt reduces score.
- High calories may reduce score.
- Good protein can improve score.
- Good fiber can improve score.
- Low saturated fat can improve score.
- Nutriscore can influence the final score.
- Simple ingredients can be a mild positive if justified.

Normalized product JSON:
${JSON.stringify(product, null, 2)}`;
};
