import type { NormalizedProduct } from '@acme/shared';
import { ChatOpenAI } from '@langchain/openai';
import { tavily } from '@tavily/core';
import { PRODUCT_ANALYZE_V2_AI_MODELS } from '../constants/photo-analysis.constants.js';
import {
  normalizeTavilyProductResultV2,
  tavilyStructuredProductV2Schema,
  TAVILY_PRODUCT_NORMALIZATION_PROMPT_V2,
  truncateTavilyTextV2,
  type TavilyStructuredProductV2,
} from '../utils/tavily-product-normalization.util.js';

interface TavilyPhotoLookupInput {
  allText: string;
  productName: string | null;
  brand: string | null;
}

interface StructuredInvoker<T> {
  invoke(input: unknown): Promise<T>;
}

const MIN_CONFIDENCE = 0.5;

export async function searchPhotoProductNutritionWithTavilyV2(
  input: TavilyPhotoLookupInput,
): Promise<NormalizedProduct | null> {
  if (!process.env.TAVILY_API_KEY || !process.env.OPENAI_API_KEY) {
    return null;
  }

  const searchQuery =
    [input.brand, input.productName].filter(Boolean).join(' ') || input.allText.slice(0, 300);
  const client = tavily({
    apiKey: process.env.TAVILY_API_KEY,
    clientSource: 'acme-product-analyze-v2-photo',
  });
  const searchResult = await client.search(
    `Find nutrition facts per 100g, ingredients and product details for this food product: ${searchQuery}`,
    { searchDepth: 'fast', includeAnswer: 'advanced', maxResults: 5, timeout: 10_000 },
  );

  if (!searchResult.answer && searchResult.results.length === 0) {
    return null;
  }

  const tavilyContext = [
    searchResult.answer
      ? `Tavily answer:\n${truncateTavilyTextV2(searchResult.answer, 2_000)}`
      : null,
    ...searchResult.results.map((result, index) =>
      [
        `Result #${index + 1}`,
        `Title: ${result.title}`,
        `URL: ${result.url}`,
        `Snippet: ${truncateTavilyTextV2(result.content, 1_000)}`,
        `Raw content: ${truncateTavilyTextV2(result.rawContent, 2_500)}`,
      ].join('\n'),
    ),
  ]
    .filter(Boolean)
    .join('\n\n---\n\n');

  const model = new ChatOpenAI({
    model: PRODUCT_ANALYZE_V2_AI_MODELS.reason,
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 1,
    timeout: 20_000,
    reasoning: { effort: 'low' },
  });
  const structuredModel = model.withStructuredOutput(tavilyStructuredProductV2Schema, {
    method: 'jsonSchema',
    name: 'product_analyze_v2_tavily_product_nutrition',
  }) as StructuredInvoker<TavilyStructuredProductV2>;
  const result = await structuredModel.invoke([
    { role: 'system', content: TAVILY_PRODUCT_NORMALIZATION_PROMPT_V2 },
    {
      role: 'user',
      content: `OCR product name: ${input.productName ?? 'unknown'}\nOCR brand: ${input.brand ?? 'unknown'}\nOCR visible text: ${truncateTavilyTextV2(input.allText, 1_500)}\n\nTavily search data:\n${tavilyContext}`,
    },
  ]);

  if (!result.found || result.confidence < MIN_CONFIDENCE || !result.product) return null;

  return normalizeTavilyProductResultV2({
    result,
    productName: input.productName,
    brand: input.brand,
  });
}

export default searchPhotoProductNutritionWithTavilyV2;
