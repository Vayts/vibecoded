import { z } from 'zod';
import { MIN_TEXT_INPUT_LENGTH } from './constants';

// ============================================================
// Deck schemas
// ============================================================

export const createDeckRequestSchema = z.object({
  title: z.string().min(1).max(200),
});
export type CreateDeckRequest = z.infer<typeof createDeckRequestSchema>;

export const deckResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastStudied: z.string().nullable(),
  cardCount: z.number(),
  cardsDue: z.number(),
});
export type DeckResponse = z.infer<typeof deckResponseSchema>;

// ============================================================
// Card schemas
// ============================================================

export const cardResponseSchema = z.object({
  id: z.string(),
  front: z.string(),
  back: z.string(),
  deckId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  // FSRS fields
  stability: z.number(),
  difficulty: z.number(),
  elapsedDays: z.number(),
  scheduledDays: z.number(),
  reps: z.number(),
  lapses: z.number(),
  state: z.number(),
  dueDate: z.string(),
});
export type CardResponse = z.infer<typeof cardResponseSchema>;

export const createCardRequestSchema = z.object({
  front: z.string().min(1).max(1000),
  back: z.string().min(1).max(1000),
  deckId: z.string(),
});
export type CreateCardRequest = z.infer<typeof createCardRequestSchema>;

export const updateCardRequestSchema = z.object({
  front: z.string().min(1).max(1000).optional(),
  back: z.string().min(1).max(1000).optional(),
});
export type UpdateCardRequest = z.infer<typeof updateCardRequestSchema>;

// ============================================================
// Generation schemas
// ============================================================

export const generateFlashcardsRequestSchema = z.union([
  z.object({
    type: z.literal('image'),
    imageBase64: z.string(),
    deckTitle: z.string().optional(),
  }),
  z.object({
    type: z.literal('images'),
    imagesBase64: z.array(z.string()).min(1).max(5),
    text: z.string().optional(),
    deckTitle: z.string().optional(),
  }),
  z.object({
    type: z.literal('text'),
    text: z.string().min(MIN_TEXT_INPUT_LENGTH),
    deckTitle: z.string().optional(),
  }),
  z.object({
    type: z.literal('mixed'),
    imagesBase64: z.array(z.string()).optional(),
    text: z.string().optional(),
    instruction: z.string().optional(),
    deckTitle: z.string().optional(),
  }),
]);
export type GenerateFlashcardsRequest = z.infer<typeof generateFlashcardsRequestSchema>;

export const generatedCardSchema = z.object({
  id: z.string().optional(), // populated in server response after DB save
  front: z.string(),
  back: z.string(),
});
export type GeneratedCard = z.infer<typeof generatedCardSchema>;

export const generateFlashcardsResponseSchema = z.object({
  deckId: z.string(),
  deckTitle: z.string(),
  cards: z.array(generatedCardSchema),
  generationsRemaining: z.number(),
});
export type GenerateFlashcardsResponse = z.infer<typeof generateFlashcardsResponseSchema>;

// ============================================================
// Review schemas
// ============================================================

export const reviewRatingSchema = z.union([
  z.literal(1), // Again
  z.literal(2), // Hard
  z.literal(3), // Good
  z.literal(4), // Easy
]);
export type ReviewRating = z.infer<typeof reviewRatingSchema>;

export const submitReviewRequestSchema = z.object({
  cardId: z.string(),
  rating: reviewRatingSchema,
});
export type SubmitReviewRequest = z.infer<typeof submitReviewRequestSchema>;

// ============================================================
// Sync schemas
// ============================================================

export const syncPullResponseSchema = z.object({
  decks: z.array(deckResponseSchema),
  cards: z.array(cardResponseSchema),
  lastSyncAt: z.string(),
});
export type SyncPullResponse = z.infer<typeof syncPullResponseSchema>;

export const syncPushRequestSchema = z.object({
  updatedCards: z.array(
    z.object({
      id: z.string(),
      stability: z.number(),
      difficulty: z.number(),
      elapsedDays: z.number(),
      scheduledDays: z.number(),
      reps: z.number(),
      lapses: z.number(),
      state: z.number(),
      dueDate: z.string(),
      updatedAt: z.string(),
    }),
  ),
  reviewLogs: z.array(
    z.object({
      cardId: z.string(),
      rating: reviewRatingSchema,
      state: z.number(),
      dueDate: z.string(),
      stability: z.number(),
      difficulty: z.number(),
      elapsedDays: z.number(),
      lastElapsedDays: z.number(),
      scheduledDays: z.number(),
      review: z.string(),
    }),
  ),
});
export type SyncPushRequest = z.infer<typeof syncPushRequestSchema>;

// ============================================================
// Extend deck schemas (V1.0-2: Add more cards to existing deck)
// ============================================================

export const extendDeckRequestSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('suggested') }),
  z.object({ mode: z.literal('expand') }),
  z.object({ mode: z.literal('text'), text: z.string().min(MIN_TEXT_INPUT_LENGTH) }),
  z.object({ mode: z.literal('image'), imageBase64: z.string() }),
]);
export type ExtendDeckRequest = z.infer<typeof extendDeckRequestSchema>;

export const extendDeckResponseSchema = z.object({
  cards: z.array(
    z.object({
      front: z.string(),
      back: z.string(),
    }),
  ),
});
export type ExtendDeckResponse = z.infer<typeof extendDeckResponseSchema>;

// ============================================================
// Chat generation schemas (CF-5: Chat-like generation flow)
// ============================================================

export const chatHistoryMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});
export type ChatHistoryMessage = z.infer<typeof chatHistoryMessageSchema>;

export const chatGenerateRequestSchema = z.object({
  history: z.array(chatHistoryMessageSchema).default([]),
  imagesBase64: z.array(z.string()).max(5).optional(),
  text: z.string().optional(),
  deckTitle: z.string().optional(),
  existingCards: z
    .array(z.object({ front: z.string(), back: z.string() }))
    .max(100)
    .optional(),
});
export type ChatGenerateRequest = z.infer<typeof chatGenerateRequestSchema>;

// Discriminated union: AI may either respond conversationally or generate cards (tool call)
export const chatGenerateResponseSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('message'), text: z.string() }),
  z.object({
    type: z.literal('cards'),
    cards: z.array(z.object({ front: z.string(), back: z.string() })),
    suggestedDeckTitle: z.string(),
    generationsRemaining: z.number(),
  }),
]);
export type ChatGenerateResponse = z.infer<typeof chatGenerateResponseSchema>;

export const saveChatDeckRequestSchema = z.object({
  title: z.string().min(1).max(200),
  cards: z
    .array(
      z.object({
        front: z.string().min(1).max(1000),
        back: z.string().min(1).max(1000),
      }),
    )
    .min(1),
});
export type SaveChatDeckRequest = z.infer<typeof saveChatDeckRequestSchema>;

export const saveChatDeckResponseSchema = z.object({
  deckId: z.string(),
  deckTitle: z.string(),
  cardCount: z.number(),
});
export type SaveChatDeckResponse = z.infer<typeof saveChatDeckResponseSchema>;

// ============================================================
// Error schema
// ============================================================

export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
