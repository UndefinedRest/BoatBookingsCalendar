/**
 * Express Application Setup
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import apiRoutes from './routes/api.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { getServerConfig } from '../config/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  const app = express();
  const config = getServerConfig();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts
        scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers (onerror, etc.)
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'https:', 'data:'],
        connectSrc: ["'self'"], // Allow API calls to same origin
        upgradeInsecureRequests: null, // Disable for HTTP-only deployment (Pi)
      },
    },
  }));

  // CORS
  app.use(cors());

  // Compression
  app.use(compression());

  // Request logging
  if (config.env === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files from public directory
  const publicPath = join(__dirname, '../../public');
  app.use(express.static(publicPath));

  // API routes
  app.use('/api/v1', apiRoutes);

  // Serve index.html for root
  app.get('/', (_req, res) => {
    res.sendFile(join(publicPath, 'index.html'));
  });

  // Serve TV display for /tv (same as root)
  app.get('/tv', (_req, res) => {
    res.sendFile(join(publicPath, 'index.html'));
  });

  // Serve configuration page for /config
  app.get('/config', (_req, res) => {
    res.sendFile(join(publicPath, 'config.html'));
  });

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
