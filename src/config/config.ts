/**
 * Configuration management
 */

import { config as loadEnv } from 'dotenv';
import { ConfigSchema } from '../models/schemas.js';
import type { Config } from '../models/types.js';

// Load environment variables
loadEnv();

/**
 * Load and validate configuration from environment
 */
export function loadConfig(): Config {
  const config = {
    baseUrl: process.env.REVSPORT_BASE_URL || 'https://www.lakemacquarierowingclub.org.au',
    username: process.env.REVSPORT_USERNAME || '',
    password: process.env.REVSPORT_PASSWORD || '',
    debug: process.env.REVSPORT_DEBUG === 'true',
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
  };

  // Validate configuration
  try {
    return ConfigSchema.parse(config);
  } catch (error) {
    console.error('❌ Configuration validation failed:');
    console.error(error);
    throw new Error('Invalid configuration. Please check your .env file.');
  }
}

export const config = loadConfig();
