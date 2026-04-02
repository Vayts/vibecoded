import { ChatOpenAI } from '@langchain/openai';
import type { NormalizedProduct, ProductFacts } from '@acme/shared';

import { AI_MODELS } from '../constants/models';
import { productFactsAiOutputSchema } from '../domain/product-facts/schema';
import {
  PRODUCT_FACTS_SYSTEM_PROMPT,
  buildProductFactsPrompt,
} from '../domain/product-facts/prompts';
import { buildProductFactsFromData } from '../domain/product-facts/build-product-facts';

export class ProductFactsAiService {
  private readonly model: ChatOpenAI;

  constructor(model?: ChatOpenAI) {
    this.model =
      model ??
      new ChatOpenAI({
        model: AI_MODELS.reason,
        apiKey: process.env.OPENAI_API_KEY,
        maxRetries: 2,
        reasoning: {"effort": "medium"},
      });
  }

  /**
   * Extract structured product facts using AI.
   * Falls back to deterministic extraction if AI is unavailable.
   */
  async extractFacts(product: NormalizedProduct): Promise<ProductFacts> {
    if (!process.env.OPENAI_API_KEY) {
      console.log('[ProductFacts] No API key, using deterministic fallback');
      return buildProductFactsFromData(product);
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
      return buildProductFactsFromData(product);
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
