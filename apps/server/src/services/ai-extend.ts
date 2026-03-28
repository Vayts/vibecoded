import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import {
  AI_MODELS,
  SUGGEST_SYSTEM_PROMPT,
  EXPAND_SYSTEM_PROMPT,
  ADDITIONAL_FROM_TEXT_SYSTEM_PROMPT,
} from '../domain/flashcards/prompts';
import { extractTextFromImage } from './vision';
import { sanitizeCards } from '../lib/mathSanitizer';

const additionalCardsSchema = z.object({
  cards: z
    .array(
      z.object({
        front: z.string().describe('Question or term to test (max 200 chars)'),
        back: z.string().describe('Answer, definition, or explanation (max 500 chars)'),
      }),
    )
    .min(1)
    .max(15)
    .describe('Array of additional flashcard pairs'),
});

type AdditionalCardsOutput = z.infer<typeof additionalCardsSchema>;

export interface ExistingCard {
  front: string;
  back: string;
}

function fmt(cards: ExistingCard[]): string {
  return cards.map((c, i) => `${i + 1}. Q: ${c.front}\n   A: ${c.back}`).join('\n');
}

function miniModel(temp: number) {
  return new ChatOpenAI({
    model: AI_MODELS.mini,
    temperature: temp,
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// LangChain's withStructuredOutput hits TS2589 with complex Zod schemas — cast required
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withCards(model: any) {
  return model.withStructuredOutput(additionalCardsSchema);
}

export async function suggestAdditionalCards(
  existingCards: ExistingCard[],
): Promise<AdditionalCardsOutput> {
  const existing = fmt(existingCards);
  const result = (await withCards(miniModel(0.5)).invoke([
    { role: 'system', content: SUGGEST_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Existing cards:\n\n${existing}\n\nSuggest 3–8 new flashcards on related topics not yet covered.`,
    },
  ])) as AdditionalCardsOutput;
  return { cards: sanitizeCards(result.cards) };
}

export async function expandExistingCards(
  existingCards: ExistingCard[],
): Promise<AdditionalCardsOutput> {
  const existing = fmt(existingCards);
  const result = (await withCards(miniModel(0.4)).invoke([
    { role: 'system', content: EXPAND_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Existing cards:\n\n${existing}\n\nCreate 3–8 new flashcards that deepen and expand on these topics.`,
    },
  ])) as AdditionalCardsOutput;
  return { cards: sanitizeCards(result.cards) };
}

export async function generateAdditionalCardsFromText(
  text: string,
  existingCards: ExistingCard[],
): Promise<AdditionalCardsOutput> {
  const existing = fmt(existingCards);
  const result = (await withCards(miniModel(0.3)).invoke([
    { role: 'system', content: ADDITIONAL_FROM_TEXT_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Existing cards:\n${existing}\n\nNew study material:\n${text}\n\nGenerate 3–15 new flashcards, avoiding duplicates.`,
    },
  ])) as AdditionalCardsOutput;
  return { cards: sanitizeCards(result.cards) };
}

export async function generateAdditionalCardsFromImage(
  imageBase64: string,
  existingCards: ExistingCard[],
): Promise<AdditionalCardsOutput> {
  const extractedText = await extractTextFromImage(imageBase64);
  return generateAdditionalCardsFromText(extractedText, existingCards);
}
