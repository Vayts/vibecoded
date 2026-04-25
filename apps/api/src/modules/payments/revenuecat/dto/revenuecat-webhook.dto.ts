import { z } from 'zod';

const revenueCatTimestampSchema = z.union([
  z.number().int().nonnegative(),
  z
    .string()
    .regex(/^\d+$/)
    .transform((value) => Number.parseInt(value, 10)),
]);

const revenueCatOptionalTimestampSchema = z.union([revenueCatTimestampSchema, z.null()]);

export const revenueCatWebhookEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  event_timestamp_ms: revenueCatTimestampSchema,
  app_user_id: z.string().min(1).nullable().optional(),
  original_app_user_id: z.string().min(1).nullable().optional(),
  aliases: z.array(z.string().min(1)).optional().default([]),
  product_id: z.string().min(1).nullable().optional(),
  new_product_id: z.string().min(1).nullable().optional(),
  expiration_at_ms: revenueCatOptionalTimestampSchema.optional().default(null),
  entitlement_ids: z.array(z.string()).optional().default([]),
  transferred_from: z.array(z.string().min(1)).optional().default([]),
  transferred_to: z.array(z.string().min(1)).optional().default([]),
  // Additional fields for logging and debugging
  store: z.string().optional().nullable(),
  environment: z.string().optional().nullable(),
  period_type: z.string().optional().nullable(),
  cancel_reason: z.string().optional().nullable(),
  expiration_reason: z.string().optional().nullable(),
  price: z.number().optional().nullable(),
  currency: z.string().optional().nullable(),
  country_code: z.string().optional().nullable(),
  is_trial_conversion: z.boolean().optional().nullable(),
});

export const revenueCatWebhookSchema = z.object({
  api_version: z.string().optional(),
  event: revenueCatWebhookEventSchema,
});

export type RevenueCatWebhookDto = z.infer<typeof revenueCatWebhookSchema>;
export type RevenueCatWebhookEventDto = z.infer<typeof revenueCatWebhookEventSchema>;

