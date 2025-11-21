/**
 * Configuration Module Tests
 *
 * Tests configuration loading and validation.
 * Note: These tests work with the actual .env file since config loads on import.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getConfig } from '../config.js';
import { ConfigSchema } from '../../models/schemas.js';

describe('Config Module', () => {
  beforeEach(() => {
    // Suppress console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  describe('getConfig', () => {
    it('should return a valid configuration object', () => {
      const config = getConfig();

      expect(config).toBeDefined();
      expect(config).toHaveProperty('baseUrl');
      expect(config).toHaveProperty('username');
      expect(config).toHaveProperty('password');
      expect(config).toHaveProperty('debug');
      expect(config).toHaveProperty('sessions');
    });

    it('should have valid baseUrl format', () => {
      const config = getConfig();

      expect(config.baseUrl).toMatch(/^https?:\/\/.+/);
    });

    it('should have sessions configuration', () => {
      const config = getConfig();

      expect(config.sessions).toHaveProperty('morning1');
      expect(config.sessions).toHaveProperty('morning2');

      expect(config.sessions.morning1).toHaveProperty('start');
      expect(config.sessions.morning1).toHaveProperty('end');
      expect(config.sessions.morning2).toHaveProperty('start');
      expect(config.sessions.morning2).toHaveProperty('end');
    });

    it('should have valid session time formats (HH:MM)', () => {
      const config = getConfig();

      const timeRegex = /^\d{2}:\d{2}$/;

      expect(config.sessions.morning1.start).toMatch(timeRegex);
      expect(config.sessions.morning1.end).toMatch(timeRegex);
      expect(config.sessions.morning2.start).toMatch(timeRegex);
      expect(config.sessions.morning2.end).toMatch(timeRegex);
    });

    it('should have debug as a boolean', () => {
      const config = getConfig();

      expect(typeof config.debug).toBe('boolean');
    });

    it('should return the same instance on multiple calls', () => {
      const config1 = getConfig();
      const config2 = getConfig();

      // Should return the same object reference (singleton)
      expect(config1).toBe(config2);
    });

    it('should pass Zod schema validation', () => {
      const config = getConfig();

      // Should not throw
      expect(() => ConfigSchema.parse(config)).not.toThrow();

      // Validate returns a valid Config object
      const validated = ConfigSchema.parse(config);

      expect(validated).toEqual(config);
    });
  });

  describe('session timing validation', () => {
    it('should have morning1 end before or equal to morning2 start', () => {
      const config = getConfig();

      const m1End = config.sessions.morning1.end.split(':').map(Number);
      const m2Start = config.sessions.morning2.start.split(':').map(Number);

      const m1EndMinutes = m1End[0] * 60 + m1End[1];
      const m2StartMinutes = m2Start[0] * 60 + m2Start[1];

      // Morning 1 should end before or at the same time Morning 2 starts
      expect(m1EndMinutes).toBeLessThanOrEqual(m2StartMinutes);
    });

    it('should have morning1 start before morning1 end', () => {
      const config = getConfig();

      const start = config.sessions.morning1.start.split(':').map(Number);
      const end = config.sessions.morning1.end.split(':').map(Number);

      const startMinutes = start[0] * 60 + start[1];
      const endMinutes = end[0] * 60 + end[1];

      expect(startMinutes).toBeLessThan(endMinutes);
    });

    it('should have morning2 start before morning2 end', () => {
      const config = getConfig();

      const start = config.sessions.morning2.start.split(':').map(Number);
      const end = config.sessions.morning2.end.split(':').map(Number);

      const startMinutes = start[0] * 60 + start[1];
      const endMinutes = end[0] * 60 + end[1];

      expect(startMinutes).toBeLessThan(endMinutes);
    });
  });

  describe('ConfigSchema validation', () => {
    it('should accept valid configuration', () => {
      const validConfig = {
        baseUrl: 'https://example.com',
        username: 'test@example.com',
        password: 'password123',
        debug: false,
        sessions: {
          morning1: {
            start: '06:30',
            end: '07:30',
          },
          morning2: {
            start: '07:30',
            end: '08:30',
          },
        },
      };

      expect(() => ConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('should reject invalid baseUrl', () => {
      const invalidConfig = {
        baseUrl: 'not-a-url',
        username: 'test@example.com',
        password: 'password',
        debug: false,
        sessions: {
          morning1: { start: '06:30', end: '07:30' },
          morning2: { start: '07:30', end: '08:30' },
        },
      };

      expect(() => ConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject invalid session time format', () => {
      const invalidConfig = {
        baseUrl: 'https://example.com',
        username: 'test@example.com',
        password: 'password',
        debug: false,
        sessions: {
          morning1: { start: '6:30', end: '7:30' }, // Invalid format
          morning2: { start: '07:30', end: '08:30' },
        },
      };

      expect(() => ConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should require all session fields', () => {
      const invalidConfig = {
        baseUrl: 'https://example.com',
        username: 'test@example.com',
        password: 'password',
        debug: false,
        sessions: {
          morning1: { start: '06:30' }, // Missing 'end'
          morning2: { start: '07:30', end: '08:30' },
        },
      };

      expect(() => ConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject empty credentials', () => {
      const configWithEmptyCredentials = {
        baseUrl: 'https://example.com',
        username: '',
        password: '',
        debug: false,
        sessions: {
          morning1: { start: '06:30', end: '07:30' },
          morning2: { start: '07:30', end: '08:30' },
        },
      };

      // Schema validation should fail for empty credentials
      expect(() => ConfigSchema.parse(configWithEmptyCredentials)).toThrow();
    });
  });
});
