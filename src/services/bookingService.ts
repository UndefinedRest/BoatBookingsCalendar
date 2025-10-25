/**
 * Booking fetching service
 * Uses JSON API endpoint /bookings/retrieve-calendar/{boatId}
 */

import { parseISO, format } from 'date-fns';
import { RawBookingsArraySchema } from '../models/schemas.js';
import type {
  Asset,
  Booking,
  RawBooking,
  Sessions,
  SessionType,
  BoatWithBookings,
} from '../models/types.js';
import type { AuthService } from '../client/auth.js';
import { Logger } from '../utils/logger.js';

export class BookingService {
  private logger: Logger;

  constructor(
    private auth: AuthService,
    private sessions: Sessions,
    debug: boolean = false
  ) {
    this.logger = new Logger('BookingService', debug);
  }

  /**
   * Fetch bookings for all assets (parallel)
   */
  async fetchAllBookings(assets: Asset[]): Promise<BoatWithBookings[]> {
    this.logger.info(`Fetching bookings for ${assets.length} assets...`);

    const startTime = Date.now();

    // Fetch all bookings in parallel
    const results = await Promise.all(
      assets.map(async (asset) => {
        const bookings = await this.fetchAssetBookings(asset.id);
        const availability = this.calculateAvailability(bookings);

        return {
          ...asset,
          bookings,
          availability,
        };
      })
    );

    const duration = Date.now() - startTime;
    const totalBookings = results.reduce((sum, r) => sum + r.bookings.length, 0);

    this.logger.success(
      `Fetched ${totalBookings} bookings from ${assets.length} assets in ${duration}ms`
    );
    this.logger.info(`Average per asset: ${Math.round(duration / assets.length)}ms`);

    return results;
  }

  /**
   * Fetch bookings for a single asset using JSON API
   */
  private async fetchAssetBookings(assetId: string): Promise<Booking[]> {
    try {
      // Calculate 7-day date range
      // Start from today, look ahead 7 days
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      weekEnd.setHours(23, 59, 59, 999); // End of day

      // Format dates as ISO with timezone (matching API format)
      const startParam = this.formatDateForAPI(weekStart);
      const endParam = this.formatDateForAPI(weekEnd);

      // Call the API endpoint with date range parameters
      const url = `/bookings/retrieve-calendar/${assetId}?start=${startParam}&end=${endParam}`;

      this.logger.debug(`Fetching ${assetId}: ${url}`);

      const response = await this.auth.get<RawBooking[]>(url);

      // Validate response
      const rawBookings = RawBookingsArraySchema.parse(response);

      // Transform to our booking format
      const bookings = rawBookings.map((raw) => this.transformBooking(raw, assetId));

      this.logger.debug(`Asset ${assetId}: ${bookings.length} bookings`);

      return bookings;
    } catch (error) {
      this.logger.warn(`Failed to fetch bookings for asset ${assetId}:`, (error as Error).message);
      this.logger.debug('Full error:', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Format date for API parameter (ISO with timezone)
   * Example: 2025-10-25T00:00:00+11:00
   */
  private formatDateForAPI(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Get timezone offset in format +HH:MM
    const offset = -date.getTimezoneOffset();
    const offsetHours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
    const offsetMins = String(Math.abs(offset) % 60).padStart(2, '0');
    const offsetSign = offset >= 0 ? '+' : '-';
    const timezone = `${offsetSign}${offsetHours}:${offsetMins}`;

    return `${year}-${month}-${day}T00:00:00${timezone}`;
  }

  /**
   * Transform raw API booking to our format
   */
  private transformBooking(raw: RawBooking, boatId: string): Booking {
    // Parse ISO datetime strings
    const startDate = parseISO(raw.start);
    const endDate = parseISO(raw.end);

    const date = format(startDate, 'yyyy-MM-dd');
    const startTime = format(startDate, 'HH:mm');
    const endTime = format(endDate, 'HH:mm');

    // Extract member name from title (e.g., "Booked by John Smith" -> "John Smith")
    const memberName = raw.title.replace(/^Booked by\s*/i, '').trim();

    // Determine session type and validity
    const { session, isValidSession } = this.determineSession(startTime, endTime);

    return {
      date,
      startTime,
      endTime,
      memberName,
      boatId,
      session,
      isValidSession,
    };
  }

  /**
   * Determine which session this booking belongs to
   */
  private determineSession(
    startTime: string,
    endTime: string
  ): { session: SessionType; isValidSession: boolean } {
    const { morning1, morning2 } = this.sessions;

    // Check if booking matches morning1 session
    if (startTime === morning1.start && endTime === morning1.end) {
      return { session: 'morning1', isValidSession: true };
    }

    // Check if booking matches morning2 session
    if (startTime === morning2.start && endTime === morning2.end) {
      return { session: 'morning2', isValidSession: true };
    }

    // Custom time - outside standard sessions
    return { session: 'custom', isValidSession: false };
  }

  /**
   * Calculate availability for a boat
   * Assumes 7 days × 2 sessions = 14 total slots per week
   */
  private calculateAvailability(bookings: Booking[]): {
    availableSlots: number;
    totalSlots: number;
    utilizationPercent: number;
  } {
    const totalSlots = 14; // 7 days × 2 sessions
    const bookedSlots = bookings.length;
    const availableSlots = totalSlots - bookedSlots;
    const utilizationPercent = Math.round((bookedSlots / totalSlots) * 100);

    return {
      availableSlots,
      totalSlots,
      utilizationPercent,
    };
  }
}
