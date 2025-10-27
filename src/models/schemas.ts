/**
 * Zod schemas for runtime validation
 */

import { z } from 'zod';

export const BoatTypeSchema = z.enum(['1X', '2X', '4X', '8X', 'Unknown']);
export const BoatClassificationSchema = z.enum(['T', 'R', 'RT']);
export const SessionTypeSchema = z.enum(['morning1', 'morning2', 'custom']);

export const AssetSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  displayName: z.string(),
  nickname: z.string(),
  type: BoatTypeSchema,
  classification: BoatClassificationSchema,
  weight: z.string().nullable(),
  sweepCapable: z.boolean(),
  calendarUrl: z.string(),
  bookingUrl: z.string(),
});

export const RawBookingSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(), // Can be string or number
  title: z.string(),
  start: z.string(),
  end: z.string(),
  url: z.string().optional(),
  extendedProps: z.object({
    newWindow: z.boolean().optional(),
  }).optional(),
});

export const RawBookingsArraySchema = z.array(RawBookingSchema);

export const BookingSchema = z.object({
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  memberName: z.string().min(1).max(100),
  boatId: z.string(),
  session: SessionTypeSchema,
  isValidSession: z.boolean(),
});

export const SessionConfigSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});

export const SessionsSchema = z.object({
  morning1: SessionConfigSchema,
  morning2: SessionConfigSchema,
});

export const ConfigSchema = z.object({
  baseUrl: z.string().url(),
  username: z.string().min(1),
  password: z.string().min(1),
  debug: z.boolean().default(false),
  sessions: SessionsSchema,
});
