import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import type { BarcodeLookupProduct } from '@acme/shared';

import { AI_MODELS } from '../domain/flashcards/prompts';

const allergenFindingSchema = z.object({
  allergen: z.string().describe('The allergen key from the input list (e.g. "PEANUTS")'),
  status: z
    .enum(['confirmed', 'trace', 'absent'])
    .describe(
      'confirmed = clearly present in ingredients or declared allergens; ' +
        'trace = may contain / cross-contamination warning; absent = not detected',
    ),
  reason: z
    .string()
    .describe('One sentence explanation referencing the specific ingredient or label, max 12 words'),
});

const allergenAnalysisOutputSchema = z.object({
  findings: z.array(allergenFindingSchema),
});

export type AllergenFinding = z.infer<typeof allergenFindingSchema>;

const ALLERGEN_ANALYSIS_SYSTEM_PROMPT = `You detect specific allergens in food products. Return JSON only.

RULES:
- Analyze ONLY the allergens listed in the request.
- "confirmed": the allergen is present in ingredients or explicitly listed as a declared allergen.
- "trace": the product has "may contain", "produced in a facility with", or similar cross-contamination warnings.
- "absent": no evidence of this allergen in the provided data.
- Return exactly one finding per allergen in the input list.
- Do NOT invent allergen presence. If uncertain, use "absent".

COMMON ALLERGEN DERIVATIVES:
- PEANUTS: peanut, groundnut, arachide, arachis
- TREE_NUTS: hazelnut, almond, walnut, cashew, pistachio, pecan, macadamia, brazil nut, pine nut
- GLUTEN: wheat, barley, rye, oats (unless certified gluten-free), spelt, kamut, triticale
- DAIRY: milk, whey, casein, lactose, butter (not peanut/nut/plant-based butter), cheese, cream, yogurt
- SOY: soy, soya, tofu, edamame, miso, tempeh
- EGGS: egg, albumin, mayonnaise
- SHELLFISH: shrimp, prawn, crab, lobster, crayfish, barnacle, krill
- SESAME: sesame, tahini, til, gingelly`;

const buildAllergenAnalysisPrompt = (
  product: BarcodeLookupProduct,
  allergies: string[],
): string => {
  const lines: string[] = [];

  if (product.product_name) lines.push(`Product: ${product.product_name}`);

  if (product.ingredients.length > 0) {
    lines.push(`Ingredients: ${product.ingredients.join(', ')}`);
  } else if (product.ingredients_text) {
    lines.push(`Ingredients text: ${product.ingredients_text}`);
  }

  if (product.allergens.length > 0) {
    lines.push(`Declared allergens: ${product.allergens.join(', ')}`);
  }

  if (product.traces.length > 0) {
    lines.push(`May contain traces of: ${product.traces.join(', ')}`);
  }

  lines.push('');
  lines.push(`Check for these allergens: ${allergies.join(', ')}`);

  return lines.join('\n');
};

export class AllergenAnalysisAiService {
  private readonly model: ChatOpenAI;

  constructor(model?: ChatOpenAI) {
    this.model =
      model ??
      new ChatOpenAI({
        model: AI_MODELS.mini,
        temperature: 0,
        apiKey: process.env.OPENAI_API_KEY,
      });
  }

  async analyzeAllergens(
    product: BarcodeLookupProduct,
    allergies: string[],
  ): Promise<Map<string, AllergenFinding>> {
    const resultMap = new Map<string, AllergenFinding>();

    if (!process.env.OPENAI_API_KEY || allergies.length === 0) {
      return resultMap;
    }

    try {
      const userMessage = buildAllergenAnalysisPrompt(product, allergies);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const structuredModel = (this.model as any).withStructuredOutput(allergenAnalysisOutputSchema);

      const result = await structuredModel.invoke([
        { role: 'system', content: ALLERGEN_ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ]);

      const parsed = allergenAnalysisOutputSchema.parse(result);
      console.log('[AllergenAnalysis] Result:', JSON.stringify(parsed, null, 2));

      for (const finding of parsed.findings) {
        resultMap.set(finding.allergen, finding);
      }

      return resultMap;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Allergen analysis AI failed: ${message}`);
      return resultMap;
    }
  }
}

let cachedService: AllergenAnalysisAiService | undefined;

export const getAllergenAnalysisService = (): AllergenAnalysisAiService => {
  if (!cachedService) {
    cachedService = new AllergenAnalysisAiService();
  }
  return cachedService;
};
