/**
 * Booking Cache Service
 * Implements smart caching with TTL to avoid excessive API calls
 */

import { Logger } from '../../utils/logger.js';
import { AuthService } from '../../client/auth.js';
import { AssetService } from '../../services/assetService.js';
import { BookingService } from '../../services/bookingService.js';
import { getConfig } from '../../config/config.js';
import { getServerConfig } from '../../config/server.js';
import { groupAndSortBoats, flattenGroupedBoats, type BoatWithBookings } from '../../services/boatGroupingService.js';

export interface CachedBookingData {
  boats: BoatWithBookings[];
  metadata: {
    generatedAt: string;
    weekStart: string;
    weekEnd: string;
    totalBoats: number;
    totalBookings: number;
    cacheExpires: string;
  };
}

export class BookingCacheService {
  private logger: Logger;
  private cache: CachedBookingData | null = null;
  private cacheExpiry: Date | null = null;
  private refreshPromise: Promise<CachedBookingData> | null = null;

  constructor() {
    this.logger = new Logger('BookingCacheService', true);
  }

  /**
   * Get bookings with smart caching
   */
  async getBookings(forceRefresh: boolean = false): Promise<CachedBookingData> {
    const now = new Date();

    // Return cached data if valid and not force refresh
    if (!forceRefresh && this.cache && this.cacheExpiry && now < this.cacheExpiry) {
      this.logger.debug('Returning cached data');
      return this.cache;
    }

    // If refresh is already in progress, wait for it
    if (this.refreshPromise) {
      this.logger.debug('Refresh in progress, waiting...');
      return this.refreshPromise;
    }

    // Start new refresh
    this.logger.info('Cache expired or force refresh, fetching new data...');
    this.refreshPromise = this.fetchFreshData();

    try {
      const data = await this.refreshPromise;
      return data;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Fetch fresh data from RevSport
   */
  private async fetchFreshData(): Promise<CachedBookingData> {
    const startTime = Date.now();
    const config = getConfig();
    const serverConfig = getServerConfig();

    try {
      // Step 1: Authenticate
      this.logger.info('Authenticating...');
      const auth = new AuthService(config);
      await auth.login();

      // Step 2: Fetch assets
      this.logger.info('Fetching assets...');
      const assetService = new AssetService(auth);
      const assets = await assetService.fetchAssets();

      // Step 3: Fetch bookings for all assets
      this.logger.info(`Fetching bookings for ${assets.length} assets...`);
      const bookingService = new BookingService(auth, config.sessions, config.debug);
      const boatsWithBookings = await bookingService.fetchAllBookings(assets);

      // Step 4: Group and sort boats
      this.logger.info('Grouping and sorting boats...');
      const grouped = groupAndSortBoats(boatsWithBookings);
      const sortedBoats = flattenGroupedBoats(grouped);

      // Step 5: Calculate metadata
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const totalBookings = sortedBoats.reduce((sum, boat) => sum + boat.bookings.length, 0);

      const cacheExpiry = new Date(now.getTime() + serverConfig.cacheTTL);

      const data: CachedBookingData = {
        boats: sortedBoats,
        metadata: {
          generatedAt: now.toISOString(),
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          totalBoats: sortedBoats.length,
          totalBookings,
          cacheExpires: cacheExpiry.toISOString(),
        },
      };

      // Update cache
      this.cache = data;
      this.cacheExpiry = cacheExpiry;

      const duration = Date.now() - startTime;
      this.logger.success(`Data refreshed in ${duration}ms`);
      this.logger.info(`Cache valid until ${cacheExpiry.toLocaleString()}`);

      return data;
    } catch (error) {
      this.logger.error('Failed to fetch fresh data', error);

      // If we have stale cache, return it with a warning
      if (this.cache) {
        this.logger.warn('Returning stale cache due to error');
        return this.cache;
      }

      throw error;
    }
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache = null;
    this.cacheExpiry = null;
    this.logger.info('Cache cleared');
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { isCached: boolean; expiresAt: string | null; age: number | null } {
    if (!this.cache || !this.cacheExpiry) {
      return { isCached: false, expiresAt: null, age: null };
    }

    const now = new Date();
    const age = now.getTime() - new Date(this.cache.metadata.generatedAt).getTime();

    return {
      isCached: true,
      expiresAt: this.cacheExpiry.toISOString(),
      age,
    };
  }
}
