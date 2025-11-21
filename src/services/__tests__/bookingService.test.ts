/**
 * BookingService Tests
 *
 * Tests booking data fetching, parsing, and availability calculation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingService } from '../bookingService.js';
import type { AuthService } from '../../client/auth.js';
import type { Asset, Sessions, RawBooking } from '../../models/types.js';

describe('BookingService', () => {
  let bookingService: BookingService;
  let mockAuth: AuthService;

  const testSessions: Sessions = {
    morning1: { start: '06:30', end: '07:30' },
    morning2: { start: '07:30', end: '08:30' },
  };

  const testAssets: Asset[] = [
    { id: 'boat-1', name: 'Single 1', category: 'Single' },
    { id: 'boat-2', name: 'Double 1', category: 'Double' },
    { id: 'boat-3', name: 'Four 1', category: 'Four' },
  ];

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

    bookingService = new BookingService(mockAuth, testSessions, false);
  });

  describe('fetchAllBookings', () => {
    it('should fetch bookings for all assets', async () => {
      // Mock API responses for each asset
      const mockBookings: RawBooking[] = [
        {
          title: 'Booked by John Smith',
          start: '2025-11-21T06:30:00+11:00',
          end: '2025-11-21T07:30:00+11:00',
        },
      ];

      (mockAuth.get as any).mockResolvedValue(mockBookings);

      const results = await bookingService.fetchAllBookings(testAssets);

      // Verify results structure
      expect(results).toHaveLength(3);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('name');
      expect(results[0]).toHaveProperty('category');
      expect(results[0]).toHaveProperty('bookings');
      expect(results[0]).toHaveProperty('availability');

      // Verify API was called for each asset
      expect(mockAuth.get).toHaveBeenCalledTimes(3);
    });

    it('should process assets in batches of 5', async () => {
      const manyAssets: Asset[] = Array.from({ length: 12 }, (_, i) => ({
        id: `boat-${i}`,
        name: `Boat ${i}`,
        category: 'Single',
      }));

      (mockAuth.get as any).mockResolvedValue([]);

      await bookingService.fetchAllBookings(manyAssets);

      // Should call API 12 times (once per asset)
      expect(mockAuth.get).toHaveBeenCalledTimes(12);
    });

    it('should handle API errors gracefully', async () => {
      // First asset succeeds, second fails, third succeeds
      (mockAuth.get as any)
        .mockResolvedValueOnce([
          {
            title: 'Booked by Alice',
            start: '2025-11-21T06:30:00+11:00',
            end: '2025-11-21T07:30:00+11:00',
          },
        ])
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce([]);

      const results = await bookingService.fetchAllBookings(testAssets);

      // Should still return results for all 3 assets
      expect(results).toHaveLength(3);

      // First asset has booking
      expect(results[0].bookings).toHaveLength(1);

      // Second asset failed - should have empty bookings
      expect(results[1].bookings).toHaveLength(0);

      // Third asset has no bookings
      expect(results[2].bookings).toHaveLength(0);
    });

    it('should calculate availability correctly', async () => {
      // Return 3 bookings for first asset
      (mockAuth.get as any)
        .mockResolvedValueOnce([
          {
            title: 'Booked by User 1',
            start: '2025-11-21T06:30:00+11:00',
            end: '2025-11-21T07:30:00+11:00',
          },
          {
            title: 'Booked by User 2',
            start: '2025-11-22T06:30:00+11:00',
            end: '2025-11-22T07:30:00+11:00',
          },
          {
            title: 'Booked by User 3',
            start: '2025-11-23T07:30:00+11:00',
            end: '2025-11-23T08:30:00+11:00',
          },
        ])
        .mockResolvedValue([]);

      const results = await bookingService.fetchAllBookings(testAssets);

      const availability = results[0].availability;

      expect(availability.totalSlots).toBe(14); // 7 days × 2 sessions
      expect(availability.availableSlots).toBe(11); // 14 - 3 bookings
      expect(availability.utilizationPercent).toBe(21); // 3/14 * 100
    });
  });

  describe('booking transformation', () => {
    it('should parse booking data correctly', async () => {
      const rawBooking: RawBooking = {
        title: 'Booked by John Smith',
        start: '2025-11-21T06:30:00+11:00',
        end: '2025-11-21T07:30:00+11:00',
      };

      (mockAuth.get as any).mockResolvedValue([rawBooking]);

      const results = await bookingService.fetchAllBookings([testAssets[0]]);
      const booking = results[0].bookings[0];

      expect(booking.date).toBe('2025-11-21');
      expect(booking.startTime).toBe('06:30');
      expect(booking.endTime).toBe('07:30');
      expect(booking.memberName).toBe('John Smith');
      expect(booking.boatId).toBe('boat-1');
    });

    it('should extract member name from title', async () => {
      const testCases = [
        { title: 'Booked by John Smith', expected: 'John Smith' },
        { title: 'booked by Jane Doe', expected: 'Jane Doe' },
        { title: 'BOOKED BY Bob Wilson', expected: 'Bob Wilson' },
      ];

      for (const testCase of testCases) {
        (mockAuth.get as any).mockResolvedValue([
          {
            title: testCase.title,
            start: '2025-11-21T06:30:00+11:00',
            end: '2025-11-21T07:30:00+11:00',
          },
        ]);

        const results = await bookingService.fetchAllBookings([testAssets[0]]);
        const booking = results[0].bookings[0];

        expect(booking.memberName).toBe(testCase.expected);
      }
    });
  });

  describe('session determination', () => {
    it('should identify morning1 session correctly', async () => {
      (mockAuth.get as any).mockResolvedValue([
        {
          title: 'Booked by User',
          start: '2025-11-21T06:30:00+11:00',
          end: '2025-11-21T07:30:00+11:00',
        },
      ]);

      const results = await bookingService.fetchAllBookings([testAssets[0]]);
      const booking = results[0].bookings[0];

      expect(booking.session).toBe('morning1');
      expect(booking.isValidSession).toBe(true);
    });

    it('should identify morning2 session correctly', async () => {
      (mockAuth.get as any).mockResolvedValue([
        {
          title: 'Booked by User',
          start: '2025-11-21T07:30:00+11:00',
          end: '2025-11-21T08:30:00+11:00',
        },
      ]);

      const results = await bookingService.fetchAllBookings([testAssets[0]]);
      const booking = results[0].bookings[0];

      expect(booking.session).toBe('morning2');
      expect(booking.isValidSession).toBe(true);
    });

    it('should identify custom session for non-standard times', async () => {
      (mockAuth.get as any).mockResolvedValue([
        {
          title: 'Booked by User',
          start: '2025-11-21T08:00:00+11:00',
          end: '2025-11-21T10:00:00+11:00',
        },
      ]);

      const results = await bookingService.fetchAllBookings([testAssets[0]]);
      const booking = results[0].bookings[0];

      expect(booking.session).toBe('custom');
      expect(booking.isValidSession).toBe(false);
    });
  });

  describe('API date formatting', () => {
    it('should include timezone in API requests', async () => {
      (mockAuth.get as any).mockResolvedValue([]);

      await bookingService.fetchAllBookings([testAssets[0]]);

      // Verify URL includes date parameters with timezone
      const callUrl = (mockAuth.get as any).mock.calls[0][0];
      expect(callUrl).toContain('start=');
      expect(callUrl).toContain('end=');
      expect(callUrl).toContain('T00:00:00'); // ISO time format
      expect(callUrl).toMatch(/[+-]\d{2}:\d{2}/); // Timezone offset
    });

    it('should request 7-day date range', async () => {
      (mockAuth.get as any).mockResolvedValue([]);

      await bookingService.fetchAllBookings([testAssets[0]]);

      const callUrl = (mockAuth.get as any).mock.calls[0][0];

      // Extract start and end dates from URL
      const startMatch = callUrl.match(/start=([^&]+)/);
      const endMatch = callUrl.match(/end=([^&]+)/);

      expect(startMatch).not.toBeNull();
      expect(endMatch).not.toBeNull();

      // Parse dates (remove timezone for comparison)
      const startDate = new Date(decodeURIComponent(startMatch[1]).replace(/[+-]\d{2}:\d{2}$/, ''));
      const endDate = new Date(decodeURIComponent(endMatch[1]).replace(/[+-]\d{2}:\d{2}$/, ''));

      // Calculate difference in days
      const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysDiff).toBe(7);
    });
  });

  describe('availability calculation', () => {
    it('should calculate 100% utilization correctly', async () => {
      // Create 14 bookings (full week)
      const fullWeekBookings = Array.from({ length: 14 }, (_, i) => ({
        title: `Booked by User ${i}`,
        start: `2025-11-${21 + Math.floor(i / 2)}T${i % 2 === 0 ? '06:30' : '07:30'}:00+11:00`,
        end: `2025-11-${21 + Math.floor(i / 2)}T${i % 2 === 0 ? '07:30' : '08:30'}:00+11:00`,
      }));

      (mockAuth.get as any).mockResolvedValue(fullWeekBookings);

      const results = await bookingService.fetchAllBookings([testAssets[0]]);
      const availability = results[0].availability;

      expect(availability.totalSlots).toBe(14);
      expect(availability.availableSlots).toBe(0);
      expect(availability.utilizationPercent).toBe(100);
    });

    it('should calculate 0% utilization for empty boat', async () => {
      (mockAuth.get as any).mockResolvedValue([]);

      const results = await bookingService.fetchAllBookings([testAssets[0]]);
      const availability = results[0].availability;

      expect(availability.totalSlots).toBe(14);
      expect(availability.availableSlots).toBe(14);
      expect(availability.utilizationPercent).toBe(0);
    });

    it('should calculate 50% utilization correctly', async () => {
      // Create 7 bookings (half week)
      const halfWeekBookings = Array.from({ length: 7 }, (_, i) => ({
        title: `Booked by User ${i}`,
        start: `2025-11-${21 + i}T06:30:00+11:00`,
        end: `2025-11-${21 + i}T07:30:00+11:00`,
      }));

      (mockAuth.get as any).mockResolvedValue(halfWeekBookings);

      const results = await bookingService.fetchAllBookings([testAssets[0]]);
      const availability = results[0].availability;

      expect(availability.totalSlots).toBe(14);
      expect(availability.availableSlots).toBe(7);
      expect(availability.utilizationPercent).toBe(50);
    });
  });
});
