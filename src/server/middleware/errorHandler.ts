/**
 * Error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/logger.js';

const logger = new Logger('ErrorHandler', true);

export interface ApiError extends Error {
  status?: number;
  code?: string;
}

/**
 * Error handler middleware
 */
export function errorHandler(
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`Error ${status}: ${message}`, err);

  res.status(status).json({
    error: {
      status,
      message,
      code: err.code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

/**
 * 404 handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      status: 404,
      message: 'Not Found',
      code: 'NOT_FOUND',
      path: req.path,
    },
  });
}
