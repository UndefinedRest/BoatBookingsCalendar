/**
 * Server Configuration Tests
 *
 * Tests server configuration loading from environment variables.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getServerConfig } from '../server.js';

describe('Server Configuration', () => {
  beforeEach(() => {
    // Suppress console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  describe('getServerConfig', () => {
    it('should return a valid server configuration', () => {
      const config = getServerConfig();

      expect(config).toBeDefined();
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('host');
      expect(config).toHaveProperty('env');
      expect(config).toHaveProperty('cacheTTL');
      expect(config).toHaveProperty('refreshInterval');
    });

    it('should have valid port number', () => {
      const config = getServerConfig();

      expect(typeof config.port).toBe('number');
      expect(config.port).toBeGreaterThan(0);
      expect(config.port).toBeLessThanOrEqual(65535);
    });

    it('should have valid host string', () => {
      const config = getServerConfig();

      expect(typeof config.host).toBe('string');
      expect(config.host.length).toBeGreaterThan(0);
    });

    it('should have valid environment value', () => {
      const config = getServerConfig();

      expect(config.env).toMatch(/^(development|production|test)$/);
    });

    it('should have valid cache TTL', () => {
      const config = getServerConfig();

      expect(typeof config.cacheTTL).toBe('number');
      expect(config.cacheTTL).toBeGreaterThan(0);
    });

    it('should have valid refresh interval', () => {
      const config = getServerConfig();

      expect(typeof config.refreshInterval).toBe('number');
      expect(config.refreshInterval).toBeGreaterThan(0);
    });

    it('should parse environment variables as numbers', () => {
      const config = getServerConfig();

      // Port should be parsed from string to number
      expect(Number.isInteger(config.port)).toBe(true);
      expect(Number.isInteger(config.cacheTTL)).toBe(true);
      expect(Number.isInteger(config.refreshInterval)).toBe(true);
    });

    it('should have reasonable cache TTL (not too short)', () => {
      const config = getServerConfig();

      // Cache TTL should be at least 1 minute (60000ms)
      expect(config.cacheTTL).toBeGreaterThanOrEqual(60000);
    });

    it('should have reasonable refresh interval (not too short)', () => {
      const config = getServerConfig();

      // Refresh interval should be at least 1 minute (60000ms)
      expect(config.refreshInterval).toBeGreaterThanOrEqual(60000);
    });

    it('should return same config on multiple calls', () => {
      const config1 = getServerConfig();
      const config2 = getServerConfig();

      // Should return equivalent values (not checking reference equality
      // since the function creates a new object each time)
      expect(config1).toEqual(config2);
    });
  });
});
