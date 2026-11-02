import { z } from 'zod';

export const createSchoolUserSchema = z.object({
  params: z.object({}),
  query: z.object({}).passthrough(),
  body: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
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
    parentEmails: z.array(z.string().trim().email().max(254).transform((value) => value.toLowerCase())).min(1).max(5),
    pickupLatitude: z.number().min(-90).max(90).optional(),
    pickupLongitude: z.number().min(-180).max(180).optional()
  }).strict().refine((body) => (body.pickupLatitude === undefined) === (body.pickupLongitude === undefined), { message: 'Provide both pickup coordinates or leave both blank', path: ['pickupLatitude'] })
});

export const updateStudentPickupLocationSchema = z.object({
  params: z.object({ studentId: z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid ID') }),
  query: z.object({}).passthrough(),
  body: z.object({
    pickupLocation: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).strict().nullable()
  }).strict()
});

export const updateStudentParentsSchema = z.object({
  params: z.object({ studentId: z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid ID') }),
  query: z.object({}).passthrough(),
  body: z.object({
    parentEmails: z.array(z.string().trim().email().max(254).transform((value) => value.toLowerCase())).min(1).max(5)
  }).strict()
});

export const resendActivationSchema = z.object({
  params: z.object({ userId: z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid ID') }),
  query: z.object({}).passthrough(),
  body: z.object({}).strict()
});

export const updateSchoolUserStatusSchema = z.object({
  params: z.object({ userId: z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid ID') }),
  query: z.object({}).passthrough(),
  body: z.object({ isActive: z.boolean() }).strict()
});

export const updateStudentStatusSchema = z.object({
  params: z.object({ studentId: z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid ID') }),
  query: z.object({}).passthrough(),
  body: z.object({ isActive: z.boolean() }).strict()
});
