import { userNameSchema } from '@acme/shared';
import { z } from 'zod';

export const updateUserRequestSchema = z
  .object({
    name: userNameSchema.optional(),
    avatarUrl: z.string().trim().min(1, 'Avatar URL is invalid').nullable().optional(),
  })
  .strict()
  .refine((value) => value.name !== undefined || value.avatarUrl !== undefined, {
    message: 'At least one field is required',
  });
