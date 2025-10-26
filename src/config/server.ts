/**
 * Server configuration
 */

export interface ServerConfig {
  port: number;
  host: string;
  env: 'development' | 'production' | 'test';
  cacheTTL: number; // Cache time-to-live in milliseconds
  refreshInterval: number; // Auto-refresh interval in milliseconds
}

export function getServerConfig(): ServerConfig {
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    env: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    cacheTTL: parseInt(process.env.CACHE_TTL || '600000', 10), // 10 minutes default
    refreshInterval: parseInt(process.env.REFRESH_INTERVAL || '600000', 10), // 10 minutes default
  };
}
