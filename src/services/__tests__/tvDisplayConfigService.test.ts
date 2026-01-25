/**
 * TV Display Configuration Service Tests
 *
 * Tests for config loading, saving, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TVDisplayConfigService } from '../tvDisplayConfigService.js';
import { TVDisplayConfigSchema, DEFAULT_TV_DISPLAY_CONFIG, type TVDisplayConfig } from '../../models/tv-display-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test config path (use a temp directory)
const TEST_CONFIG_DIR = path.join(__dirname, '../../../.test-config');
const TEST_CONFIG_PATH = path.join(TEST_CONFIG_DIR, 'tv-display.json');

describe('TVDisplayConfigService', () => {
  let service: TVDisplayConfigService;

  beforeEach(async () => {
    // Create a fresh service instance for each test
    service = new TVDisplayConfigService();
    service.clearCache();

    // Ensure test config directory exists
    await fs.mkdir(TEST_CONFIG_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rm(TEST_CONFIG_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Schema Validation', () => {
    it('should accept config with missing damaged section (backwards compatibility)', () => {
      // This config is missing the colors.damaged section
      const oldConfig = {
        version: 1,
        layout: {
          daysToDisplay: 7,
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
          memberNameFormat: 'full' as const,
          logoUrl: 'https://example.com/logo.png',
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
          // Note: damaged section is missing - should use defaults
        },
        timing: {
          refreshInterval: 300000,
        },
      };

      // Import the schema to test validation
      // Using imported TVDisplayConfigSchema

      // Should not throw - damaged section should use defaults
      const parsed = TVDisplayConfigSchema.parse(oldConfig);

      // Verify defaults were applied
      expect(parsed.colors.damaged).toBeDefined();
      expect(parsed.colors.damaged.rowBackground).toBe('#fee2e2');
      expect(parsed.colors.damaged.iconColor).toBe('#dc2626');
      expect(parsed.colors.damaged.textColor).toBe('#991b1b');
    });

    it('should validate refresh interval is within bounds', () => {
      // Using imported TVDisplayConfigSchema

      // Too low
      const tooLow = {
        ...DEFAULT_TV_DISPLAY_CONFIG,
        timing: { refreshInterval: 30000 }, // 30 seconds, below 60000 minimum
      };
      expect(() => TVDisplayConfigSchema.parse(tooLow)).toThrow();

      // Too high
      const tooHigh = {
        ...DEFAULT_TV_DISPLAY_CONFIG,
        timing: { refreshInterval: 7200000 }, // 2 hours, above 3600000 maximum
      };
      expect(() => TVDisplayConfigSchema.parse(tooHigh)).toThrow();

      // Just right
      const valid = {
        ...DEFAULT_TV_DISPLAY_CONFIG,
        timing: { refreshInterval: 180000 }, // 3 minutes
      };
      expect(() => TVDisplayConfigSchema.parse(valid)).not.toThrow();
    });
  });

  describe('Default Configuration', () => {
    it('should have all required fields in DEFAULT_TV_DISPLAY_CONFIG', () => {
      expect(DEFAULT_TV_DISPLAY_CONFIG.version).toBeDefined();
      expect(DEFAULT_TV_DISPLAY_CONFIG.layout).toBeDefined();
      expect(DEFAULT_TV_DISPLAY_CONFIG.typography).toBeDefined();
      expect(DEFAULT_TV_DISPLAY_CONFIG.columns).toBeDefined();
      expect(DEFAULT_TV_DISPLAY_CONFIG.display).toBeDefined();
      expect(DEFAULT_TV_DISPLAY_CONFIG.colors).toBeDefined();
      expect(DEFAULT_TV_DISPLAY_CONFIG.timing).toBeDefined();
    });

    it('should have refresh interval of 5 minutes by default', () => {
      expect(DEFAULT_TV_DISPLAY_CONFIG.timing.refreshInterval).toBe(300000);
    });

    it('should have damaged boat colors defined', () => {
      expect(DEFAULT_TV_DISPLAY_CONFIG.colors.damaged).toBeDefined();
      expect(DEFAULT_TV_DISPLAY_CONFIG.colors.damaged.rowBackground).toBeDefined();
      expect(DEFAULT_TV_DISPLAY_CONFIG.colors.damaged.iconColor).toBeDefined();
      expect(DEFAULT_TV_DISPLAY_CONFIG.colors.damaged.textColor).toBeDefined();
    });
  });

  describe('Refresh Interval Formatting', () => {
    it('should convert milliseconds to minutes correctly', () => {
      // 60000ms = 1 min
      expect(Math.round(60000 / 60000)).toBe(1);

      // 300000ms = 5 min
      expect(Math.round(300000 / 60000)).toBe(5);

      // 180000ms = 3 min
      expect(Math.round(180000 / 60000)).toBe(3);

      // 600000ms = 10 min
      expect(Math.round(600000 / 60000)).toBe(10);

      // 3600000ms = 60 min
      expect(Math.round(3600000 / 60000)).toBe(60);
    });

    it('should format refresh interval display string correctly', () => {
      const formatRefreshInterval = (ms: number): string => {
        const minutes = Math.round(ms / 60000);
        return `${minutes} min`;
      };

      expect(formatRefreshInterval(60000)).toBe('1 min');
      expect(formatRefreshInterval(180000)).toBe('3 min');
      expect(formatRefreshInterval(300000)).toBe('5 min');
      expect(formatRefreshInterval(600000)).toBe('10 min');
    });

    it('should generate correct auto-refresh display text', () => {
      // This mimics the logic in tv-display.js applyConfig()
      const generateAutoRefreshText = (config: { timing: { refreshInterval: number } }): string => {
        const minutes = Math.round(config.timing.refreshInterval / 60000);
        return `• Auto-refresh: ${minutes} min`;
      };

      expect(generateAutoRefreshText({ timing: { refreshInterval: 60000 } })).toBe('• Auto-refresh: 1 min');
      expect(generateAutoRefreshText({ timing: { refreshInterval: 180000 } })).toBe('• Auto-refresh: 3 min');
      expect(generateAutoRefreshText({ timing: { refreshInterval: 300000 } })).toBe('• Auto-refresh: 5 min');
      expect(generateAutoRefreshText({ timing: { refreshInterval: 600000 } })).toBe('• Auto-refresh: 10 min');

      // Test with default config
      expect(generateAutoRefreshText({ timing: { refreshInterval: DEFAULT_TV_DISPLAY_CONFIG.timing.refreshInterval } }))
        .toBe('• Auto-refresh: 5 min');
    });
  });

  describe('Config Saving Validation', () => {
    it('should accept config without damaged section due to optional default', () => {
      // Using imported TVDisplayConfigSchema

      // Config without damaged section - should now work due to optional with default
      const configWithoutDamaged = {
        version: 1,
        layout: DEFAULT_TV_DISPLAY_CONFIG.layout,
        typography: DEFAULT_TV_DISPLAY_CONFIG.typography,
        columns: DEFAULT_TV_DISPLAY_CONFIG.columns,
        display: DEFAULT_TV_DISPLAY_CONFIG.display,
        colors: {
          boatTypes: DEFAULT_TV_DISPLAY_CONFIG.colors.boatTypes,
          rows: DEFAULT_TV_DISPLAY_CONFIG.colors.rows,
          ui: DEFAULT_TV_DISPLAY_CONFIG.colors.ui,
          // damaged is missing - should use defaults
        },
        timing: DEFAULT_TV_DISPLAY_CONFIG.timing,
      };

      // Should not throw - damaged is now optional with defaults
      const parsed = TVDisplayConfigSchema.parse(configWithoutDamaged);
      expect(parsed.colors.damaged).toBeDefined();
      expect(parsed.colors.damaged.rowBackground).toBe('#fee2e2');
    });

    it('should preserve damaged colors when provided', () => {
      // Using imported TVDisplayConfigSchema

      const customDamaged = {
        rowBackground: '#fecaca',
        iconColor: '#ef4444',
        textColor: '#b91c1c',
      };

      const configWithCustomDamaged = {
        ...DEFAULT_TV_DISPLAY_CONFIG,
        colors: {
          ...DEFAULT_TV_DISPLAY_CONFIG.colors,
          damaged: customDamaged,
        },
      };

      const parsed = TVDisplayConfigSchema.parse(configWithCustomDamaged);
      expect(parsed.colors.damaged.rowBackground).toBe('#fecaca');
      expect(parsed.colors.damaged.iconColor).toBe('#ef4444');
      expect(parsed.colors.damaged.textColor).toBe('#b91c1c');
    });
  });
});
