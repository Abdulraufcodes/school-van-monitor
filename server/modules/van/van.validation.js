import mongoose from 'mongoose';
import { z } from 'zod';

const objectId = z.string().refine((value) => mongoose.isValidObjectId(value), {
  message: 'Must be a valid MongoDB ObjectId'
});

export const locationUpdateSchema = z.object({
  params: z.object({ vanId: objectId }),
  query: z.object({}).passthrough(),
  body: z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    recordedAt: z.string().datetime({ offset: true }).optional()
  }).strict()
});
