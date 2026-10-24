import { z } from 'zod';

export const loginSchema = z.object({
  params: z.object({}),
  query: z.object({}).passthrough(),
  body: z.object({
    email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
    password: z.string().min(1).max(128)
  }).strict()
});
