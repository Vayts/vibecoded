import { ChatOpenAI } from '@langchain/openai';

import { AI_MODELS } from '../constants/models';
import {
  productFactsAiOutputSchema,
  type AiClassification,
} from '../domain/product-facts/schema';
import {
  PRODUCT_FACTS_SYSTEM_PROMPT,
  buildProductFactsPrompt,
} from '../domain/product-facts/prompts';
import { buildClassificationFromData } from '../domain/product-facts/build-product-facts';
import type { NormalizedProduct } from '@acme/shared';

export class ProductFactsAiService {
  private readonly model: ChatOpenAI;

  constructor(model?: ChatOpenAI) {
    this.model =
      model ??
      new ChatOpenAI({
        model: AI_MODELS.reason,
        apiKey: process.env.OPENAI_API_KEY,
        maxRetries: 1,
        reasoning: {"effort": "low"},
      });
  }

  /**
   * Extract structured classification facts using AI.
   * Returns productType, dietCompatibility, nutriGrade only — no nutrition data.
   * Falls back to deterministic extraction if AI is unavailable.
   */
  async extractClassification(product: NormalizedProduct): Promise<AiClassification> {
    if (!process.env.OPENAI_API_KEY) {
      console.log('[ProductFacts] No API key, using deterministic fallback');
      return buildClassificationFromData(product);
    }

    try {
      const userMessage = buildProductFactsPrompt(product);
      console.log('[ProductFacts] Prompt:\n', userMessage);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const structuredModel = (this.model as any).withStructuredOutput(
        productFactsAiOutputSchema,
      );

      const result = await structuredModel.invoke([
        { role: 'system', content: PRODUCT_FACTS_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ]);

      const parsed = productFactsAiOutputSchema.parse(result);
      console.log('[ProductFacts] AI result:', JSON.stringify(parsed, null, 2));
      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ProductFacts] AI extraction failed: ${message}, using deterministic fallback`);
      return buildClassificationFromData(product);
    }
  }
}

let cachedService: ProductFactsAiService | undefined;

export const getProductFactsService = (): ProductFactsAiService => {
  if (!cachedService) {
    cachedService = new ProductFactsAiService();
  }
  return cachedService;
};
