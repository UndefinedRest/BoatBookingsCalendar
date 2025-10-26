/**
 * Club-specific configuration
 * This file can be customized for different rowing clubs
 */

export interface ClubConfig {
  name: string;
  shortName: string;
  timezone: string;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
  };
  sessions: {
    morning1: { start: string; end: string };
    morning2: { start: string; end: string };
  };
  boatGroups: {
    singles: string[];
    doubles: string[];
    quads: string[];
  };
}

/**
 * Get club configuration from environment or use defaults
 */
export function getClubConfig(): ClubConfig {
  return {
    name: process.env.CLUB_NAME || 'Lake Macquarie Rowing Club',
    shortName: process.env.CLUB_SHORT_NAME || 'LMRC',
    timezone: process.env.CLUB_TIMEZONE || 'Australia/Sydney',

    branding: {
      primaryColor: process.env.CLUB_PRIMARY_COLOR || '#1e40af', // Blue
      secondaryColor: process.env.CLUB_SECONDARY_COLOR || '#0ea5e9', // Light blue
      logoUrl: process.env.CLUB_LOGO_URL,
    },

    sessions: {
      morning1: {
        start: process.env.SESSION_1_START || '06:30',
        end: process.env.SESSION_1_END || '07:30',
      },
      morning2: {
        start: process.env.SESSION_2_START || '07:30',
        end: process.env.SESSION_2_END || '08:30',
      },
    },

    // Boat type identification patterns
    boatGroups: {
      singles: ['1X'],
      doubles: ['2X', '2-'],
      quads: ['4X', '4+', '4-', '8X', '8+'],
    },
  };
}
