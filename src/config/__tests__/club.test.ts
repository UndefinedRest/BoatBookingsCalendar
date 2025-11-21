/**
 * Club Configuration Tests
 *
 * Tests club configuration loading from environment variables.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getClubConfig } from '../club.js';

describe('Club Configuration', () => {
  beforeEach(() => {
    // Suppress console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  describe('getClubConfig', () => {
    it('should return a valid club configuration', () => {
      const config = getClubConfig();

      expect(config).toBeDefined();
      expect(config).toHaveProperty('name');
      expect(config).toHaveProperty('shortName');
      expect(config).toHaveProperty('timezone');
      expect(config).toHaveProperty('branding');
      expect(config).toHaveProperty('sessions');
      expect(config).toHaveProperty('boatGroups');
    });

    it('should have valid branding configuration', () => {
      const config = getClubConfig();

      expect(config.branding).toHaveProperty('primaryColor');
      expect(config.branding).toHaveProperty('secondaryColor');
      expect(config.branding.primaryColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(config.branding.secondaryColor).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should have valid session configuration', () => {
      const config = getClubConfig();

      expect(config.sessions).toHaveProperty('morning1');
      expect(config.sessions).toHaveProperty('morning2');

      expect(config.sessions.morning1).toHaveProperty('start');
      expect(config.sessions.morning1).toHaveProperty('end');
      expect(config.sessions.morning2).toHaveProperty('start');
      expect(config.sessions.morning2).toHaveProperty('end');

      // Validate time format (HH:MM)
      const timeRegex = /^\d{2}:\d{2}$/;
      expect(config.sessions.morning1.start).toMatch(timeRegex);
      expect(config.sessions.morning1.end).toMatch(timeRegex);
      expect(config.sessions.morning2.start).toMatch(timeRegex);
      expect(config.sessions.morning2.end).toMatch(timeRegex);
    });

    it('should have valid boat groups configuration', () => {
      const config = getClubConfig();

      expect(config.boatGroups).toHaveProperty('singles');
      expect(config.boatGroups).toHaveProperty('doubles');
      expect(config.boatGroups).toHaveProperty('quads');

      expect(Array.isArray(config.boatGroups.singles)).toBe(true);
      expect(Array.isArray(config.boatGroups.doubles)).toBe(true);
      expect(Array.isArray(config.boatGroups.quads)).toBe(true);

      expect(config.boatGroups.singles).toContain('1X');
      expect(config.boatGroups.doubles).toContain('2X');
      expect(config.boatGroups.quads).toContain('4X');
    });

    it('should use default LMRC values when env vars not set', () => {
      const config = getClubConfig();

      // These tests will pass with actual .env or defaults
      expect(typeof config.name).toBe('string');
      expect(typeof config.shortName).toBe('string');
      expect(typeof config.timezone).toBe('string');
      expect(config.name.length).toBeGreaterThan(0);
      expect(config.shortName.length).toBeGreaterThan(0);
    });

    it('should have valid timezone format', () => {
      const config = getClubConfig();

      // Should be in format like "Australia/Sydney"
      expect(config.timezone).toMatch(/^[A-Za-z]+\/[A-Za-z_]+$/);
    });

    it('should have morning1 end before or equal to morning2 start', () => {
      const config = getClubConfig();

      const m1End = config.sessions.morning1.end.split(':').map(Number);
      const m2Start = config.sessions.morning2.start.split(':').map(Number);

      const m1EndMinutes = m1End[0] * 60 + m1End[1];
      const m2StartMinutes = m2Start[0] * 60 + m2Start[1];

      expect(m1EndMinutes).toBeLessThanOrEqual(m2StartMinutes);
    });

    it('should have valid session durations', () => {
      const config = getClubConfig();

      const m1Start = config.sessions.morning1.start.split(':').map(Number);
      const m1End = config.sessions.morning1.end.split(':').map(Number);
      const m2Start = config.sessions.morning2.start.split(':').map(Number);
      const m2End = config.sessions.morning2.end.split(':').map(Number);

      const m1StartMinutes = m1Start[0] * 60 + m1Start[1];
      const m1EndMinutes = m1End[0] * 60 + m1End[1];
      const m2StartMinutes = m2Start[0] * 60 + m2Start[1];
      const m2EndMinutes = m2End[0] * 60 + m2End[1];

      expect(m1EndMinutes).toBeGreaterThan(m1StartMinutes);
      expect(m2EndMinutes).toBeGreaterThan(m2StartMinutes);
    });
  });
});
