/**
 * AssetService Tests
 *
 * Tests boat (asset) fetching and parsing from HTML.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssetService } from '../assetService.js';
import type { AuthService } from '../../client/auth.js';

describe('AssetService', () => {
  let assetService: AssetService;
  let mockAuth: AuthService;

  beforeEach(() => {
    // Suppress console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});

    // Create mock auth service
    mockAuth = {
      get: vi.fn(),
      login: vi.fn(),
      getClient: vi.fn(),
      isLoggedIn: vi.fn().mockReturnValue(true),
    } as any;

    assetService = new AssetService(mockAuth, false);
  });

  describe('fetchAssets', () => {
    it('should fetch and parse assets from HTML', async () => {
      const mockHtml = `
        <div class="card card-hover">
          <div class="mr-3">1X - Carmody single scull ( Go For Gold )</div>
          <a href="/bookings/calendar/123">Calendar</a>
        </div>
        <div class="card card-hover">
          <div class="mr-3">2X - Swift double 70 KG</div>
          <a href="/bookings/calendar/456">Calendar</a>
        </div>
      `;

      (mockAuth.get as any).mockResolvedValue(mockHtml);

      const assets = await assetService.fetchAssets();

      expect(assets).toHaveLength(2);
      expect(assets[0].id).toBe('123');
      expect(assets[1].id).toBe('456');
    });

    it('should skip cards without boat names', async () => {
      const mockHtml = `
        <div class="card card-hover">
          <div class="mr-3">1X - Valid Boat</div>
          <a href="/bookings/calendar/123">Calendar</a>
        </div>
        <div class="card card-hover">
          <div class="mr-3"></div>
          <a href="/bookings/calendar/456">Calendar</a>
        </div>
      `;

      (mockAuth.get as any).mockResolvedValue(mockHtml);

      const assets = await assetService.fetchAssets();

      expect(assets).toHaveLength(1);
      expect(assets[0].id).toBe('123');
    });

    it('should skip cards without boat IDs', async () => {
      const mockHtml = `
        <div class="card card-hover">
          <div class="mr-3">1X - Valid Boat</div>
          <a href="/bookings/calendar/123">Calendar</a>
        </div>
        <div class="card card-hover">
          <div class="mr-3">2X - Invalid Boat</div>
          <a href="/bookings/other">Calendar</a>
        </div>
      `;

      (mockAuth.get as any).mockResolvedValue(mockHtml);

      const assets = await assetService.fetchAssets();

      expect(assets).toHaveLength(1);
      expect(assets[0].id).toBe('123');
    });

    it('should handle empty HTML gracefully', async () => {
      (mockAuth.get as any).mockResolvedValue('<html></html>');

      const assets = await assetService.fetchAssets();

      expect(assets).toHaveLength(0);
    });
  });

  describe('boat name parsing', () => {
    it('should parse single scull (1X)', async () => {
      const mockHtml = `
        <div class="card card-hover">
          <div class="mr-3">1X - Carmody single scull ( Go For Gold )</div>
          <a href="/bookings/calendar/123">Calendar</a>
        </div>
      `;

      (mockAuth.get as any).mockResolvedValue(mockHtml);

      const assets = await assetService.fetchAssets();
      const asset = assets[0];

      expect(asset.type).toBe('1X');
      expect(asset.displayName).toContain('Carmody');
      expect(asset.nickname).toBe('Go For Gold');
      expect(asset.sweepCapable).toBe(false);
    });

    it('should parse double (2X)', async () => {
      const mockHtml = `
        <div class="card card-hover">
          <div class="mr-3">2X - Swift double 70 KG</div>
          <a href="/bookings/calendar/123">Calendar</a>
        </div>
      `;

      (mockAuth.get as any).mockResolvedValue(mockHtml);

      const assets = await assetService.fetchAssets();
      const asset = assets[0];

      expect(asset.type).toBe('2X');
      expect(asset.weight).toBe('70');
      expect(asset.displayName).toContain('Swift');
    });

    it('should parse quad (4X)', async () => {
      const mockHtml = `
        <div class="card card-hover">
          <div class="mr-3">4X - Ausrowtec coxed quad 90 KG Hunter</div>
          <a href="/bookings/calendar/123">Calendar</a>
        </div>
      `;

      (mockAuth.get as any).mockResolvedValue(mockHtml);

      const assets = await assetService.fetchAssets();
      const asset = assets[0];

      expect(asset.type).toBe('4X');
      expect(asset.weight).toBe('90');
    });

    it('should parse eight (8X)', async () => {
      const mockHtml = `
        <div class="card card-hover">
          <div class="mr-3">8X - Filippi eight</div>
          <a href="/bookings/calendar/123">Calendar</a>
        </div>
      `;

      (mockAuth.get as any).mockResolvedValue(mockHtml);

      const assets = await assetService.fetchAssets();
      const asset = assets[0];

      expect(asset.type).toBe('8X');
    });
  });

  describe('classification parsing', () => {
    it('should identify RACER classification', async () => {
      const mockHtml = `
        <div class="card card-hover">
          <div class="mr-3">2X RACER - Swift double 70 KG</div>
          <a href="/bookings/calendar/123">Calendar</a>
        </div>
      `;

      (mockAuth.get as any).mockResolvedValue(mockHtml);

      const assets = await assetService.fetchAssets();

      expect(assets[0].classification).toBe('R');
    });

    it('should identify RT classification', async () => {
      const mockHtml = `
        <div class="card card-hover">
          <div class="mr-3">1X RT - Training single</div>
          <a href="/bookings/calendar/123">Calendar</a>
        </div>
      `;

      (mockAuth.get as any).mockResolvedValue(mockHtml);

      const assets = await assetService.fetchAssets();

      expect(assets[0].classification).toBe('RT');
    });

    it('should default to T classification', async () => {
      const mockHtml = `
        <div class="card card-hover">
          <div class="mr-3">1X - Basic training single</div>
          <a href="/bookings/calendar/123">Calendar</a>
        </div>
      `;

      (mockAuth.get as any).mockResolvedValue(mockHtml);

      const assets = await assetService.fetchAssets();

      expect(assets[0].classification).toBe('T');
    });
  });

  describe('sweep capability detection', () => {
    it('should detect sweep capability with /+', async () => {
      const mockHtml = `
        <div class="card card-hover">
          <div class="mr-3">2X/+ - Sweep capable double</div>
          <a href="/bookings/calendar/123">Calendar</a>
        </div>
      `;

      (mockAuth.get as any).mockResolvedValue(mockHtml);

      const assets = await assetService.fetchAssets();

      expect(assets[0].sweepCapable).toBe(true);
    });

    it('should detect sweep capability with /-', async () => {
      const mockHtml = `
        <div class="card card-hover">
          <div class="mr-3">2X/- RACER - Partridge 95 KG</div>
          <a href="/bookings/calendar/123">Calendar</a>
        </div>
      `;

      (mockAuth.get as any).mockResolvedValue(mockHtml);

      const assets = await assetService.fetchAssets();

      expect(assets[0].sweepCapable).toBe(true);
    });

    it('should not detect sweep capability without marker', async () => {
      const mockHtml = `
        <div class="card card-hover">
          <div class="mr-3">2X - Regular double</div>
          <a href="/bookings/calendar/123">Calendar</a>
        </div>
      `;

      (mockAuth.get as any).mockResolvedValue(mockHtml);

      const assets = await assetService.fetchAssets();

      expect(assets[0].sweepCapable).toBe(false);
    });
  });

  describe('weight extraction', () => {
    it('should extract weight in KG', async () => {
      const testCases = [
        { name: '2X - Swift double 70 KG', expected: '70' },
        { name: '1X - Single 65KG', expected: '65' },
        { name: '4X - Quad 90 kg', expected: '90' },
        { name: '2X - Double 100 Kg', expected: '100' },
      ];

      for (const testCase of testCases) {
        const mockHtml = `
          <div class="card card-hover">
            <div class="mr-3">${testCase.name}</div>
            <a href="/bookings/calendar/123">Calendar</a>
          </div>
        `;

        (mockAuth.get as any).mockResolvedValue(mockHtml);

        const assets = await assetService.fetchAssets();

        expect(assets[0].weight).toBe(testCase.expected);
      }
    });

    it('should return null weight when not specified', async () => {
      const mockHtml = `
        <div class="card card-hover">
          <div class="mr-3">1X - Single without weight</div>
          <a href="/bookings/calendar/123">Calendar</a>
        </div>
      `;

      (mockAuth.get as any).mockResolvedValue(mockHtml);

      const assets = await assetService.fetchAssets();

      expect(assets[0].weight).toBeNull();
    });
  });

  describe('nickname extraction', () => {
    it('should extract nickname from parentheses', async () => {
      const testCases = [
        { name: '1X - Carmody ( Go For Gold )', expected: 'Go For Gold' },
        { name: '2X - Swift (Ian Krix)', expected: 'Ian Krix' },
        { name: '4X - Quad ( Hunter )', expected: 'Hunter' },
      ];

      for (const testCase of testCases) {
        const mockHtml = `
          <div class="card card-hover">
            <div class="mr-3">${testCase.name}</div>
            <a href="/bookings/calendar/123">Calendar</a>
          </div>
        `;

        (mockAuth.get as any).mockResolvedValue(mockHtml);

        const assets = await assetService.fetchAssets();

        expect(assets[0].nickname).toBe(testCase.expected);
      }
    });

    it('should return empty nickname when not present', async () => {
      const mockHtml = `
        <div class="card card-hover">
          <div class="mr-3">1X - Single without nickname</div>
          <a href="/bookings/calendar/123">Calendar</a>
        </div>
      `;

      (mockAuth.get as any).mockResolvedValue(mockHtml);

      const assets = await assetService.fetchAssets();

      expect(assets[0].nickname).toBe('');
    });
  });

  describe('display name generation', () => {
    it('should clean up display name properly', async () => {
      const testCases = [
        {
          fullName: '1X - Carmody single scull ( Go For Gold )',
          expectedContains: 'Carmody',
        },
        {
          fullName: '2X RACER - Swift double 70 KG (Ian Krix)',
          expectedContains: 'Swift',
        },
        {
          fullName: '4X - Ausrowtec coxed quad 90 KG Hunter',
          expectedContains: 'Ausrowtec',
        },
      ];

      for (const testCase of testCases) {
        const mockHtml = `
          <div class="card card-hover">
            <div class="mr-3">${testCase.fullName}</div>
            <a href="/bookings/calendar/123">Calendar</a>
          </div>
        `;

        (mockAuth.get as any).mockResolvedValue(mockHtml);

        const assets = await assetService.fetchAssets();
        const displayName = assets[0].displayName;

        expect(displayName).toContain(testCase.expectedContains);
        expect(displayName).not.toMatch(/^\d+X/); // Should not start with type
        expect(displayName).not.toContain('RACER');
        expect(displayName).not.toMatch(/\d+\s*KG/); // Should not contain weight
        expect(displayName).not.toMatch(/\([^)]*\)/); // Should not contain parentheses
      }
    });
  });

  describe('URL generation', () => {
    it('should generate correct calendar and booking URLs', async () => {
      const mockHtml = `
        <div class="card card-hover">
          <div class="mr-3">1X - Test Boat</div>
          <a href="/bookings/calendar/123">Calendar</a>
        </div>
      `;

      (mockAuth.get as any).mockResolvedValue(mockHtml);

      const assets = await assetService.fetchAssets();
      const asset = assets[0];

      expect(asset.calendarUrl).toBe('/bookings/calendar/123');
      expect(asset.bookingUrl).toBe('/bookings/123');
    });
  });

  describe('complex boat name parsing', () => {
    it('should parse comprehensive boat name correctly', async () => {
      const mockHtml = `
        <div class="card card-hover">
          <div class="mr-3">2X/- RACER - Partridge double/pair 95 KG (Olympic Dream)</div>
          <a href="/bookings/calendar/789">Calendar</a>
        </div>
      `;

      (mockAuth.get as any).mockResolvedValue(mockHtml);

      const assets = await assetService.fetchAssets();
      const asset = assets[0];

      expect(asset.id).toBe('789');
      expect(asset.type).toBe('2X');
      expect(asset.classification).toBe('R');
      expect(asset.weight).toBe('95');
      expect(asset.sweepCapable).toBe(true);
      expect(asset.nickname).toBe('Olympic Dream');
      expect(asset.displayName).toContain('Partridge');
      expect(asset.displayName).not.toContain('RACER');
      expect(asset.displayName).not.toContain('95 KG');
      expect(asset.displayName).not.toContain('Olympic Dream');
    });
  });
});
