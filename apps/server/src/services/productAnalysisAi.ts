import { ChatOpenAI } from '@langchain/openai';

import { AI_MODELS } from '../domain/flashcards/prompts';
import { normalizedProductSchema, productAnalysisResultSchema } from '../domain/product-analysis/schema';
import {
  buildProductAnalysisPrompt,
  PRODUCT_ANALYSIS_SYSTEM_PROMPT,
} from '../domain/product-analysis/prompts';
import type { NormalizedProduct, ProductAnalysisResult } from '../domain/product-analysis/types';

export class ProductAnalysisAiService {
  private readonly model: ChatOpenAI;

  constructor(model?: ChatOpenAI) {
    this.model =
      model ??
      new ChatOpenAI({
        model: AI_MODELS.reason,
        temperature: 1,
        apiKey: process.env.OPENAI_API_KEY,
        modelKwargs: { reasoning: { effort: 'medium' } },
      });
  }

  async analyzeProduct(product: NormalizedProduct): Promise<ProductAnalysisResult> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const parsedProduct = normalizedProductSchema.parse(product);

    try {
      const structuredModel = (this.model as any).withStructuredOutput(productAnalysisResultSchema);

      const result = (await structuredModel.invoke([
        { role: 'system', content: PRODUCT_ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: buildProductAnalysisPrompt(parsedProduct) },
      ])) as ProductAnalysisResult;

      return productAnalysisResultSchema.parse(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown parsing error';
      throw new Error(`Product analysis AI failed: ${message}`);
    }
  }
}
