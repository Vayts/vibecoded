import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import {
  AI_MODELS,
  FLASHCARD_SYSTEM_PROMPT,
  CHAT_SYSTEM_PROMPT,
  buildExtendSystemPrompt,
} from './prompts';
import { extractTextFromImage } from './vision';
import { fixMathDelimiters, sanitizeCards } from '../lib/mathSanitizer';
import type { ChatHistoryMessage } from '@acme/shared';

const flashcardsSchema = z.object({
  deckTitle: z
    .string()
    .describe('A concise, descriptive title for the flashcard deck (max 60 chars)'),
  cards: z
    .array(
      z.object({
        front: z.string().describe('Question or term to test (max 200 chars)'),
        back: z.string().describe('Answer, definition, or explanation (max 500 chars)'),
      }),
    )
    .min(3)
    .max(20)
    .describe('Array of flashcard pairs'),
});

type FlashcardsOutput = z.infer<typeof flashcardsSchema>;

// Tool definition for structured output via LangChain tool-calling
const generateFlashcardsTool = {
  type: 'function' as const,
  function: {
    name: 'generate_flashcards',
    description: 'Generate a set of spaced-repetition flashcards from the provided study material',
    parameters: {
      type: 'object',
      properties: {
        deck_title: {
          type: 'string',
          description: 'Concise, descriptive deck title (max 60 chars)',
        },
        cards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              front: { type: 'string', description: 'Question or term (max 200 chars)' },
              back: { type: 'string', description: 'Answer or explanation (max 500 chars)' },
            },
            required: ['front', 'back'],
          },
          minItems: 3,
          maxItems: 20,
        },
      },
      required: ['deck_title', 'cards'],
    },
  },
};

export type ChatResult =
  | { type: 'message'; text: string }
  | { type: 'cards'; deckTitle: string; cards: { front: string; back: string }[] };

export async function chatWithFlashcards(options: {
  history: ChatHistoryMessage[];
  imagesBase64?: string[];
  text?: string;
  deckTitleHint?: string;
  existingCards?: Array<{ front: string; back: string }>;
}): Promise<ChatResult> {
  const { history, imagesBase64 = [], text, deckTitleHint, existingCards } = options;

  const hasImages = imagesBase64.length > 0;
  const hasText = !!text?.trim();

  if (!hasImages && !hasText && history.length === 0) {
    throw new Error('No content provided');
  }

  // Use extend prompt when existing cards are provided; fallback to standard chat prompt
  const systemPrompt =
    existingCards && existingCards.length > 0
      ? buildExtendSystemPrompt(existingCards)
      : CHAT_SYSTEM_PROMPT;

  // Build LangChain messages from history
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [{ role: 'system', content: systemPrompt }];
  for (const msg of history) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Build the current user message.
  // When images are present, pass them directly as image_url content so the vision
  // model can "see" them regardless of what came before in the conversation.
  // This fixes the bug where images sent after a text-only first message were silently
  // dropped when OCR returned empty/whitespace content.
  if (hasImages || hasText) {
    const hint = deckTitleHint ? `[Topic hint: "${deckTitleHint}"]\n\n` : '';

    if (hasImages) {
      // Multi-modal content: optional text prefix followed by each image
      type TextPart = { type: 'text'; text: string };
      type ImagePart = { type: 'image_url'; image_url: { url: string; detail: string } };
      const contentParts: Array<TextPart | ImagePart> = [];
      if (hint || hasText) {
        contentParts.push({ type: 'text', text: hint + (text ?? '') });
      }
      for (const imgBase64 of imagesBase64) {
        contentParts.push({
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${imgBase64}`, detail: 'high' },
        });
      }
      messages.push({ role: 'user', content: contentParts });
    } else {
      // Text-only message — plain string content
      messages.push({ role: 'user', content: hint + text });
    }
  }

  // Use vision model when images are present so multi-modal content is processed
  // correctly; use the faster mini model for text-only turns.
  const modelName = hasImages ? AI_MODELS.vision : AI_MODELS.mini;
  const model = new ChatOpenAI({
    model: modelName,
    temperature: 0.6,
    apiKey: process.env.OPENAI_API_KEY,
  });

  // LangChain's bindTools typing doesn't support custom tool schemas — cast required
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelWithTools = (model as any).bindTools([generateFlashcardsTool]);
  const response = await modelWithTools.invoke(messages);

  // Check if the model called our tool
  const toolCalls = response.tool_calls ?? [];
  if (toolCalls.length > 0) {
    const call = toolCalls[0];
    const args = call.args as { deck_title: string; cards: { front: string; back: string }[] };
    return { type: 'cards', deckTitle: args.deck_title, cards: sanitizeCards(args.cards) };
  }

  // No tool call — return the conversational text response
  const textContent =
    typeof response.content === 'string'
      ? response.content
      : (response.content as Array<{ type: string; text?: string }>)
          .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map((p) => p.text)
          .join('');

  return {
    type: 'message',
    text: fixMathDelimiters(textContent) || 'I need more information to generate cards.',
  };
}

export async function generateFlashcardsFromText(
  text: string,
  deckTitleHint?: string,
): Promise<FlashcardsOutput> {
  const model = new ChatOpenAI({
    model: AI_MODELS.mini,
    temperature: 0.6,
    apiKey: process.env.OPENAI_API_KEY,
  });
  // LangChain's withStructuredOutput hits TS2589 with complex Zod schemas — cast required
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const structured = (model as any).withStructuredOutput(flashcardsSchema);

  const userContent = deckTitleHint
    ? `Generate flashcards for a deck titled "${deckTitleHint}".\n\n${text}`
    : text;

  const result = (await structured.invoke([
    { role: 'system', content: FLASHCARD_SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ])) as FlashcardsOutput;

  return { ...result, cards: sanitizeCards(result.cards) };
}

export async function generateFlashcardsFromImage(
  imageBase64: string,
  deckTitleHint?: string,
): Promise<FlashcardsOutput> {
  const extractedText = await extractTextFromImage(imageBase64);
  return generateFlashcardsFromText(extractedText, deckTitleHint);
}

export async function generateFlashcardsFromImages(
  imagesBase64: string[],
  extraText?: string,
  deckTitleHint?: string,
): Promise<FlashcardsOutput> {
  const extractedTexts = await Promise.all(imagesBase64.map(extractTextFromImage));
  const combined = [
    ...extractedTexts.map((t, i) => `--- Image ${i + 1} ---\n${t}`),
    ...(extraText ? [`--- Additional notes ---\n${extraText}`] : []),
  ].join('\n\n');
  return generateFlashcardsFromText(combined, deckTitleHint);
}

export async function generateFlashcardsFromMixed(options: {
  imagesBase64?: string[];
  text?: string;
  instruction?: string;
  deckTitleHint?: string;
}): Promise<FlashcardsOutput> {
  const { imagesBase64 = [], text, instruction, deckTitleHint } = options;

  const parts: string[] = [];

  if (imagesBase64.length > 0) {
    const extractedTexts = await Promise.all(imagesBase64.map(extractTextFromImage));
    extractedTexts.forEach((t, i) => {
      parts.push(`--- Image ${i + 1} ---\n${t}`);
    });
  }

  if (text) {
    parts.push(`--- Notes ---\n${text}`);
  }

  if (parts.length === 0) {
    throw new Error('No content provided');
  }

  const combined = parts.join('\n\n');
  const hint = instruction
    ? `${deckTitleHint ? `Deck: "${deckTitleHint}". ` : ''}Instruction: ${instruction}`
    : deckTitleHint;

  return generateFlashcardsFromText(combined, hint);
}
