/**
 * TV Display Configuration Types and Schemas
 * MVP: Colors, Typography, Column Titles, Days to Display, Refresh Interval
 */

import { z } from 'zod';

/**
 * Color validation helper - accepts hex colors
 */
const ColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g., #1e40af)');

/**
 * TV Display Configuration Schema (MVP)
 */
export const TVDisplayConfigSchema = z.object({
  version: z.number().default(1),
  lastModified: z.string().datetime().optional(),

  layout: z.object({
    daysToDisplay: z.number().int().min(1).max(7).default(5),
    boatRowHeight: z.number().int().min(40).max(120).default(60),
    sessionRowHeight: z.number().int().min(20).max(60).default(30),
    boatNameWidth: z.number().int().min(250).max(500).default(360),
  }),

  typography: z.object({
    boatNameSize: z.number().int().min(16).max(40).default(26),
    bookingDetailsSize: z.number().int().min(14).max(32).default(22),
    columnTitleSize: z.number().int().min(20).max(48).default(32),
  }),

  columns: z.object({
    leftTitle: z.string().max(50).default('CLUB BOATS'),
    rightTitle: z.string().max(50).default('RACE BOATS'),
  }),

  display: z.object({
    memberNameFormat: z.enum(['full', 'first-only', 'first-last-initial']).default('full'),
  }),

  colors: z.object({
    boatTypes: z.object({
      singles: ColorSchema.default('#fffbeb'),
      doubles: ColorSchema.default('#eff6ff'),
      quads: ColorSchema.default('#f0fdf4'),
      other: ColorSchema.default('#fafafa'),
    }),
    rows: z.object({
      even: ColorSchema.default('#fafafa'),
      odd: ColorSchema.default('#ffffff'),
    }),
    ui: z.object({
      boatTypeBadge: ColorSchema.default('#0ea5e9'),
      columnHeader: ColorSchema.default('#1e40af'),
      bookingTime: ColorSchema.default('#dc2626'),
      typeSeparator: ColorSchema.default('#64748b'),
    }),
  }),

  timing: z.object({
    refreshInterval: z.number().int().min(60000).max(3600000).default(300000), // 1-60 minutes in ms
  }),
});

/**
 * TypeScript type for TV Display Config
 */
export type TVDisplayConfig = z.infer<typeof TVDisplayConfigSchema>;

/**
 * Default configuration values
 */
export const DEFAULT_TV_DISPLAY_CONFIG: TVDisplayConfig = {
  version: 1,

  layout: {
    daysToDisplay: 5,
    boatRowHeight: 60,
    sessionRowHeight: 30,
    boatNameWidth: 360,
  },

  typography: {
    boatNameSize: 26,
    bookingDetailsSize: 22,
    columnTitleSize: 32,
  },

  columns: {
    leftTitle: 'CLUB BOATS',
    rightTitle: 'RACE BOATS',
  },

  display: {
    memberNameFormat: 'full',
  },

  colors: {
    boatTypes: {
      singles: '#fffbeb',
      doubles: '#eff6ff',
      quads: '#f0fdf4',
      other: '#fafafa',
    },
    rows: {
      even: '#fafafa',
      odd: '#ffffff',
    },
    ui: {
      boatTypeBadge: '#0ea5e9',
      columnHeader: '#1e40af',
      bookingTime: '#dc2626',
      typeSeparator: '#64748b',
    },
  },

  timing: {
    refreshInterval: 300000, // 5 minutes
  },
};
