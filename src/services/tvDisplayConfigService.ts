/**
 * TV Display Configuration Service
 * Handles reading, writing, and validating TV display configuration
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TVDisplayConfigSchema, DEFAULT_TV_DISPLAY_CONFIG, type TVDisplayConfig } from '../models/tv-display-config.js';
import { Logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE_PATH = path.join(__dirname, '../../config/tv-display.json');
const logger = new Logger('TVDisplayConfigService', false);

/**
 * TV Display Configuration Service
 */
export class TVDisplayConfigService {
  private cachedConfig: TVDisplayConfig | null = null;
  private lastLoadTime: number = 0;
  private readonly CACHE_TTL = 5000; // 5 seconds cache

  /**
   * Load configuration from file, with fallback to defaults
   */
  async load(): Promise<TVDisplayConfig> {
    // Return cached config if fresh
    const now = Date.now();
    if (this.cachedConfig && (now - this.lastLoadTime) < this.CACHE_TTL) {
      return this.cachedConfig;
    }

    try {
      // Check if config file exists
      await fs.access(CONFIG_FILE_PATH);

      // Read and parse config file
      const fileContent = await fs.readFile(CONFIG_FILE_PATH, 'utf-8');
      const parsedConfig = JSON.parse(fileContent);

      // Validate with schema (will fill in defaults for missing fields)
      const validatedConfig = TVDisplayConfigSchema.parse(parsedConfig);

      // Update cache
      this.cachedConfig = validatedConfig;
      this.lastLoadTime = now;

      logger.info('TV display config loaded successfully');
      return validatedConfig;

    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.info('TV display config file not found, using defaults');

        // Create default config file
        await this.save(DEFAULT_TV_DISPLAY_CONFIG);

        this.cachedConfig = DEFAULT_TV_DISPLAY_CONFIG;
        this.lastLoadTime = now;
        return DEFAULT_TV_DISPLAY_CONFIG;
      }

      logger.error('Error loading TV display config, using defaults:', error);

      // Return defaults on any error
      this.cachedConfig = DEFAULT_TV_DISPLAY_CONFIG;
      this.lastLoadTime = now;
      return DEFAULT_TV_DISPLAY_CONFIG;
    }
  }

  /**
   * Save configuration to file
   */
  async save(config: TVDisplayConfig): Promise<void> {
    try {
      // Validate config before saving
      const validatedConfig = TVDisplayConfigSchema.parse(config);

      // Update lastModified timestamp
      validatedConfig.lastModified = new Date().toISOString();
      validatedConfig.version = (validatedConfig.version || 1) + 1;

      // Ensure config directory exists
      const configDir = path.dirname(CONFIG_FILE_PATH);
      await fs.mkdir(configDir, { recursive: true });

      // Write config to file with pretty formatting
      await fs.writeFile(
        CONFIG_FILE_PATH,
        JSON.stringify(validatedConfig, null, 2),
        'utf-8'
      );

      // Update cache
      this.cachedConfig = validatedConfig;
      this.lastLoadTime = Date.now();

      logger.success('TV display config saved successfully');

    } catch (error) {
      logger.error('Error saving TV display config:', error);
      throw new Error('Failed to save configuration');
    }
  }

  /**
   * Reset configuration to defaults
   */
  async reset(): Promise<TVDisplayConfig> {
    logger.info('Resetting TV display config to defaults');
    await this.save(DEFAULT_TV_DISPLAY_CONFIG);
    return DEFAULT_TV_DISPLAY_CONFIG;
  }

  /**
   * Update specific configuration fields (partial update)
   */
  async update(partialConfig: Partial<TVDisplayConfig>): Promise<TVDisplayConfig> {
    // Load current config
    const currentConfig = await this.load();

    // Deep merge with current config
    const updatedConfig = this.deepMerge(currentConfig, partialConfig);

    // Save and return
    await this.save(updatedConfig);
    return updatedConfig;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cachedConfig = null;
    this.lastLoadTime = 0;
  }

  /**
   * Deep merge helper for nested objects
   */
  private deepMerge(target: any, source: any): any {
    const output = { ...target };

    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }

    return output;
  }

  /**
   * Check if value is a plain object
   */
  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}

// Singleton instance
export const tvDisplayConfigService = new TVDisplayConfigService();
