/**
 * API Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { BookingCacheService } from '../services/bookingCache.js';
import { getClubConfig } from '../../config/club.js';
import { getServerConfig } from '../../config/server.js';
import { tvDisplayConfigService } from '../../services/tvDisplayConfigService.js';

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

/**
 * GET /api/v1/config/tv-display
 * Get TV display configuration
 */
router.get('/config/tv-display', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await tvDisplayConfigService.load();

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/config/tv-display
 * Update TV display configuration
 */
router.post('/config/tv-display', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updatedConfig = await tvDisplayConfigService.save(req.body);

    res.json({
      success: true,
      data: updatedConfig,
      message: 'Configuration updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/config/tv-display/reset
 * Reset TV display configuration to defaults
 */
router.post('/config/tv-display/reset', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const defaultConfig = await tvDisplayConfigService.reset();

    res.json({
      success: true,
      data: defaultConfig,
      message: 'Configuration reset to defaults',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
