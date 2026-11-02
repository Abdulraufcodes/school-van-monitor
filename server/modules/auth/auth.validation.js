import { z } from 'zod';

export const loginSchema = z.object({
  params: z.object({}),
  query: z.object({}).passthrough(),
  body: z.object({
    email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
    password: z.string().min(1).max(128)
  }).strict()
});

const common = { params: z.object({}), query: z.object({}).passthrough() };
const strongPassword = z.string().min(12).max(128);
export const activationSchema = z.object({ ...common, body: z.object({ token: z.string().min(20).max(200), password: strongPassword }).strict() });
export const resetRequestSchema = z.object({ ...common, body: z.object({ email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()) }).strict() });
export const resetPasswordSchema = z.object({ ...common, body: z.object({ token: z.string().min(20).max(200), password: strongPassword }).strict() });
export const changePasswordSchema = z.object({ ...common, body: z.object({ currentPassword: z.string().min(1).max(128), password: strongPassword }).strict() });
