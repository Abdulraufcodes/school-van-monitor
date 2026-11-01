import { z } from 'zod';

export const assignedVansSchema = z.object({
  params: z.object({}).strict(),
  query: z.object({}).strict(),
  body: z.object({}).strict().optional()
});
