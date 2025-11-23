/**
 * TV Display Configuration Tests
 *
 * Tests TV display configuration schema and defaults.
 */

import { describe, it, expect } from 'vitest';
import { TVDisplayConfigSchema, DEFAULT_TV_DISPLAY_CONFIG } from '../tv-display-config.js';

describe('TVDisplayConfig Module', () => {
  describe('TVDisplayConfigSchema', () => {
    it('should validate the default configuration', () => {
      expect(() => TVDisplayConfigSchema.parse(DEFAULT_TV_DISPLAY_CONFIG)).not.toThrow();
    });

    it('should have required color sections', () => {
      const config = DEFAULT_TV_DISPLAY_CONFIG;

      expect(config.colors).toBeDefined();
      expect(config.colors.boatTypes).toBeDefined();
      expect(config.colors.rows).toBeDefined();
      expect(config.colors.ui).toBeDefined();
      expect(config.colors.damaged).toBeDefined();
    });

    it('should have damaged boat color configuration', () => {
      const config = DEFAULT_TV_DISPLAY_CONFIG;

      expect(config.colors.damaged).toHaveProperty('rowBackground');
      expect(config.colors.damaged).toHaveProperty('iconColor');
      expect(config.colors.damaged).toHaveProperty('textColor');
    });

    it('should have valid hex colors for damaged boats', () => {
      const config = DEFAULT_TV_DISPLAY_CONFIG;
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

      expect(config.colors.damaged.rowBackground).toMatch(hexColorRegex);
      expect(config.colors.damaged.iconColor).toMatch(hexColorRegex);
      expect(config.colors.damaged.textColor).toMatch(hexColorRegex);
    });

    it('should accept valid damaged boat colors', () => {
      const validConfig = {
        ...DEFAULT_TV_DISPLAY_CONFIG,
        colors: {
          ...DEFAULT_TV_DISPLAY_CONFIG.colors,
          damaged: {
            rowBackground: '#fee2e2',
            iconColor: '#dc2626',
            textColor: '#991b1b',
          },
        },
      };

      expect(() => TVDisplayConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('should reject invalid hex colors for damaged boats', () => {
      const invalidConfig = {
        ...DEFAULT_TV_DISPLAY_CONFIG,
        colors: {
          ...DEFAULT_TV_DISPLAY_CONFIG.colors,
          damaged: {
            rowBackground: 'red', // Invalid - not hex
            iconColor: '#dc2626',
            textColor: '#991b1b',
          },
        },
      };

      expect(() => TVDisplayConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject short hex colors for damaged boats', () => {
      const invalidConfig = {
        ...DEFAULT_TV_DISPLAY_CONFIG,
        colors: {
          ...DEFAULT_TV_DISPLAY_CONFIG.colors,
          damaged: {
            rowBackground: '#fee', // Invalid - too short
            iconColor: '#dc2626',
            textColor: '#991b1b',
          },
        },
      };

      expect(() => TVDisplayConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should accept damaged section with default values when fields are missing', () => {
      // Zod schema has defaults, so missing fields will use defaults rather than throw
      const configWithMissingField = {
        ...DEFAULT_TV_DISPLAY_CONFIG,
        colors: {
          ...DEFAULT_TV_DISPLAY_CONFIG.colors,
          damaged: {
            rowBackground: '#fee2e2',
            iconColor: '#dc2626',
            // Missing textColor - will use default
          },
        },
      };

      // Should not throw because schema has defaults
      expect(() => TVDisplayConfigSchema.parse(configWithMissingField as any)).not.toThrow();

      // Parse and verify default was applied
      const parsed = TVDisplayConfigSchema.parse(configWithMissingField as any);
      expect(parsed.colors.damaged.textColor).toBe('#991b1b');
    });

    it('should have layout configuration', () => {
      const config = DEFAULT_TV_DISPLAY_CONFIG;

      expect(config.layout).toBeDefined();
      expect(config.layout.daysToDisplay).toBeGreaterThanOrEqual(1);
      expect(config.layout.daysToDisplay).toBeLessThanOrEqual(7);
    });

    it('should have typography configuration', () => {
      const config = DEFAULT_TV_DISPLAY_CONFIG;

      expect(config.typography).toBeDefined();
      expect(config.typography.boatNameSize).toBeGreaterThan(0);
      expect(config.typography.bookingDetailsSize).toBeGreaterThan(0);
      expect(config.typography.columnTitleSize).toBeGreaterThan(0);
    });

    it('should have columns configuration', () => {
      const config = DEFAULT_TV_DISPLAY_CONFIG;

      expect(config.columns).toBeDefined();
      expect(config.columns.leftTitle).toBe('CLUB BOATS');
      expect(config.columns.rightTitle).toBe('RACE BOATS');
    });

    it('should have display configuration', () => {
      const config = DEFAULT_TV_DISPLAY_CONFIG;

      expect(config.display).toBeDefined();
      expect(config.display.memberNameFormat).toBe('full');
      expect(config.display.logoUrl).toBeDefined();
    });

    it('should have timing configuration', () => {
      const config = DEFAULT_TV_DISPLAY_CONFIG;

      expect(config.timing).toBeDefined();
      expect(config.timing.refreshInterval).toBeGreaterThanOrEqual(60000);
      expect(config.timing.refreshInterval).toBeLessThanOrEqual(3600000);
    });

    it('should accept configuration with all boat type colors', () => {
      const validConfig = {
        ...DEFAULT_TV_DISPLAY_CONFIG,
        colors: {
          ...DEFAULT_TV_DISPLAY_CONFIG.colors,
          boatTypes: {
            singles: '#fffbeb',
            doubles: '#eff6ff',
            quads: '#f0fdf4',
            other: '#fafafa',
          },
        },
      };

      expect(() => TVDisplayConfigSchema.parse(validConfig)).not.toThrow();
    });
  });

  describe('Damaged Boats Color Defaults', () => {
    it('should use light red for row background by default', () => {
      expect(DEFAULT_TV_DISPLAY_CONFIG.colors.damaged.rowBackground).toBe('#fee2e2');
    });

    it('should use red for icon color by default', () => {
      expect(DEFAULT_TV_DISPLAY_CONFIG.colors.damaged.iconColor).toBe('#dc2626');
    });

    it('should use dark red for text color by default', () => {
      expect(DEFAULT_TV_DISPLAY_CONFIG.colors.damaged.textColor).toBe('#991b1b');
    });
  });
});
