import mongoose from 'mongoose';
import { z } from 'zod';

// Reusable validation for MongoDB ObjectId route parameters.
const objectId = z.string().refine(
  (value) => mongoose.isValidObjectId(value),
  { message: 'Must be a valid MongoDB ObjectId' }
);

export const startTripSchema = z.object({
  params: z.object({}),
  query: z.object({}).passthrough(),
  body: z.object({
    vanId: objectId,
    tripType: z.enum(['morning_pickup', 'afternoon_dropoff'])
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

// Validate the trip ID before attempting to retrieve its location.
export const tripLocationSchema = z.object({
  params: z.object({
    tripId: objectId
  }),
  query: z.object({}).passthrough(),
  body: z.object({}).strict()
});

// This endpoint does not accept client-supplied school or trip IDs.
// School scope comes from the authenticated admin middleware.
export const schoolActiveTripLocationsSchema = z.object({
  params: z.object({}),
  query: z.object({}).passthrough(),
  body: z.object({}).strict()
});
