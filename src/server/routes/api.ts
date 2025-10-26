/**
 * API Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { BookingCacheService } from '../services/bookingCache.js';
import { getClubConfig } from '../../config/club.js';
import { getServerConfig } from '../../config/server.js';

const router = Router();
const bookingCache = new BookingCacheService();

/**
 * GET /api/v1/bookings
 * Get booking data (with caching)
 */
router.get('/bookings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const data = await bookingCache.getBookings(forceRefresh);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/config
 * Get club configuration for frontend
 */
router.get('/config', (_req: Request, res: Response) => {
  const clubConfig = getClubConfig();
  const serverConfig = getServerConfig();

  res.json({
    success: true,
    data: {
      club: {
        name: clubConfig.name,
        shortName: clubConfig.shortName,
        branding: clubConfig.branding,
        sessions: clubConfig.sessions,
      },
      refreshInterval: serverConfig.refreshInterval,
    },
  });
});

/**
 * GET /api/v1/health
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  const cacheStatus = bookingCache.getCacheStatus();

  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      cache: cacheStatus,
    },
  });
});

/**
 * POST /api/v1/cache/clear
 * Clear cache (useful for testing/debugging)
 */
router.post('/cache/clear', (_req: Request, res: Response) => {
  bookingCache.clearCache();

  res.json({
    success: true,
    message: 'Cache cleared',
  });
});

export default router;
