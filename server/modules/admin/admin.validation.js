import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid ID');

export const createSchoolUserSchema = z.object({
  params: z.object({}),
  query: z.object({}).passthrough(),
  body: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
    password: z.string().min(12).max(128),
    role: z.enum(['driver', 'parent']),
    phone: z.string().trim().max(20).optional()
  }).strict()
});

export const createStudentSchema = z.object({
  params: z.object({}),
  query: z.object({}).passthrough(),
  body: z.object({
    name: z.string().trim().min(2).max(100),
    className: z.string().trim().max(50).optional(),
    parentEmails: z.array(z.string().trim().email().max(254).transform((value) => value.toLowerCase())).min(1).max(5)
  }).strict()
});

export const studentIdSchema = z.object({
  params: z.object({ studentId: objectId }),
  query: z.object({}).passthrough(),
  body: z.object({}).passthrough()
});
