/**
 * Server Entry Point
 */

import 'dotenv/config';
import { createApp } from './app.js';
import { getServerConfig } from '../config/server.js';
import { getClubConfig } from '../config/club.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('Server', true);

async function start() {
  try {
    const serverConfig = getServerConfig();
    const clubConfig = getClubConfig();

    const app = createApp();

    const server = app.listen(serverConfig.port, serverConfig.host, () => {
      logger.success('='.repeat(80));
      logger.success(`${clubConfig.name} - Booking Viewer`);
      logger.success('='.repeat(80));
      logger.info(`Environment: ${serverConfig.env}`);
      logger.info(`Server: http://${serverConfig.host}:${serverConfig.port}`);
      logger.info(`API: http://${serverConfig.host}:${serverConfig.port}/api/v1`);
      logger.info(`Cache TTL: ${serverConfig.cacheTTL / 1000}s`);
      logger.info(`Auto-refresh: ${serverConfig.refreshInterval / 1000}s`);
      logger.success('='.repeat(80));
      logger.success('Server started successfully');
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down gracefully...');
      server.close(() => {
        logger.success('Server closed');
        process.exit(0);
      });

      // Force close after 10s
      setTimeout(() => {
        logger.warn('Forcing shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
