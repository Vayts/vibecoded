import { ChatOpenAI } from '@langchain/openai';

import { AI_MODELS } from './prompts';
import { normalizedProductSchema, productAnalysisResultSchema } from './productAnalysisSchema';
import {
  buildProductAnalysisPrompt,
  PRODUCT_ANALYSIS_SYSTEM_PROMPT,
} from './productAnalysisPrompts';
import type { NormalizedProduct, ProductAnalysisResult } from './productAnalysisTypes';

export class ProductAnalysisAiService {
  private readonly model: ChatOpenAI;

  constructor(model?: ChatOpenAI) {
    this.model =
      model ??
      new ChatOpenAI({
        model: AI_MODELS.mini,
        temperature: 0.1,
        apiKey: process.env.OPENAI_API_KEY,
      });
  }

  async analyzeProduct(product: NormalizedProduct): Promise<ProductAnalysisResult> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const parsedProduct = normalizedProductSchema.parse(product);

    try {
      // LangChain typing for withStructuredOutput remains too deep for strict TS here.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export async function exampleAnalyzeProduct(): Promise<ProductAnalysisResult> {
  const service = new ProductAnalysisAiService();
  const sampleProduct: NormalizedProduct = {
    code: '3017620422003',
    product_name: 'Hazelnut Cocoa Spread',
    brands: 'Example Brand',
    image_url: null,
    nutriscore_grade: 'e',
    ingredients_text: 'Sugar, palm oil, hazelnuts, cocoa, skimmed milk powder',
    ingredients: ['sugar', 'palm oil', 'hazelnuts', 'cocoa', 'skimmed milk powder'],
    allergens: ['milk', 'nuts'],
    additives: [],
    additives_count: 0,
    traces: [],
    countries: [],
    category_tags: [],
    categories: null,
    quantity: null,
    serving_size: null,
    images: {
      front_url: null,
      ingredients_url: null,
      nutrition_url: null,
    },
    nutrition: {
      energy_kcal_100g: 539,
      proteins_100g: 6.3,
      fat_100g: 30.9,
      saturated_fat_100g: 10.6,
      carbohydrates_100g: 57.5,
      sugars_100g: 56.3,
      fiber_100g: 0,
      salt_100g: 0.107,
      sodium_100g: 0.0428,
    },
    scores: {
      nutriscore_grade: 'e',
      nutriscore_score: 30,
      ecoscore_grade: null,
      ecoscore_score: null,
    },
  };

  const result = await service.analyzeProduct(sampleProduct);
  console.log(JSON.stringify(result, null, 2));
  return result;
}
