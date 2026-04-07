import { z } from 'zod';

export const updateUserRequestSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
  })
  .strict();
