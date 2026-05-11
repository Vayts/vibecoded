import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

const AI_MODEL = 'gpt-5.4-nano';

const translationOutputSchema = z.object({
  ingredientsEnglish: z.array(z.string()),
  ingredientsTextEnglish: z.string().nullable(),
});

export type TranslatedIngredients = {
  ingredientsOriginal: string[];
  ingredientsEnglish: string[];
  ingredientsTextOriginal: string | null;
  ingredientsTextEnglish: string | null;
};

function isLikelyEnglish(texts: string[]): boolean {
  if (!texts.length) return true;
  // Simple heuristic: if most words are ASCII alphabetic, likely English
  const sample = texts.slice(0, 5).join(' ');
  const asciiAlpha = (sample.match(/[a-zA-Z]/g) ?? []).length;
  const total = sample.replace(/\s/g, '').length;
  return total === 0 || asciiAlpha / total > 0.85;
}

export async function translateIngredientsToEnglish(
  ingredientsOriginal: string[],
  ingredientsTextOriginal: string | null,
): Promise<TranslatedIngredients> {
  if (!ingredientsOriginal.length && !ingredientsTextOriginal) {
    return {
      ingredientsOriginal,
      ingredientsEnglish: ingredientsOriginal,
      ingredientsTextOriginal,
      ingredientsTextEnglish: ingredientsTextOriginal,
    };
  }

  if (isLikelyEnglish(ingredientsOriginal)) {
    return {
      ingredientsOriginal,
      ingredientsEnglish: ingredientsOriginal,
      ingredientsTextOriginal,
      ingredientsTextEnglish: ingredientsTextOriginal,
    };
  }

  try {
    const model = new ChatOpenAI({ modelName: AI_MODEL });
    const structured = model.withStructuredOutput(translationOutputSchema);

    const inputLines = ingredientsOriginal.map((ing, i) => `${i + 1}. ${ing}`).join('\n');
    const textSection = ingredientsTextOriginal
      ? `\nIngredients text (full):\n${ingredientsTextOriginal}`
      : '';

    const result = await structured.invoke([
      {
        role: 'system',
        content: `You are a food ingredient translator. Translate the given food ingredient names/phrases to English.
Rules:
- Preserve the exact order of ingredients.
- Preserve additive/E-number codes (E300, E250, etc.) as-is.
- Preserve percentages if present.
- Preserve allergen terms accurately.
- Do not translate brand names unless they are clearly ingredient words.
- If an ingredient is already in English, return it unchanged.
- Return the same number of items as input.
- Return a translated ingredientsText string if the original ingredientsText is provided, otherwise null.
Return strictly valid JSON only.`,
      },
      {
        role: 'user',
        content: `Translate these food ingredients to English:\n${inputLines}${textSection}`,
      },
    ]);

    const parsed = translationOutputSchema.parse(result);

    if (parsed.ingredientsEnglish.length !== ingredientsOriginal.length) {
      console.warn(
        '[ProductAnalyzeV2] Ingredient translation returned wrong count, using originals',
      );
      return {
        ingredientsOriginal,
        ingredientsEnglish: ingredientsOriginal,
        ingredientsTextOriginal,
        ingredientsTextEnglish: ingredientsTextOriginal,
      };
    }

    return {
      ingredientsOriginal,
      ingredientsEnglish: parsed.ingredientsEnglish,
      ingredientsTextOriginal,
      ingredientsTextEnglish: parsed.ingredientsTextEnglish,
    };
  } catch (err) {
    console.error('[ProductAnalyzeV2] Ingredient translation failed, using originals:', err);
    return {
      ingredientsOriginal,
      ingredientsEnglish: ingredientsOriginal,
      ingredientsTextOriginal,
      ingredientsTextEnglish: ingredientsTextOriginal,
    };
  }
}
