import mongoose from 'mongoose';
import { z } from 'zod';

const objectId = z.string().refine(
  (value) => mongoose.isValidObjectId(value),
  { message: 'Must be a valid MongoDB ObjectId' }
);

export const startTripSchema = z.object({
  params: z.object({}),
  query: z.object({}).passthrough(),
  body: z.object({
    vanId: objectId
  }).strict()
});

export const activeTripSchema = z.object({
  params: z.object({}),
  query: z.object({}).passthrough(),
  body: z.object({}).passthrough()
});

export const endTripSchema = z.object({
  params: z.object({
    tripId: objectId
  }),
  query: z.object({}).passthrough(),
  body: z.object({}).strict()
});
