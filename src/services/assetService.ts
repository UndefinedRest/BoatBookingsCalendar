/**
 * Asset (boat) fetching service
 * Scrapes boat list from /bookings page
 */

import * as cheerio from 'cheerio';
import { AssetSchema } from '../models/schemas.js';
import type { Asset, BoatType, BoatClassification, BoatCategory } from '../models/types.js';
import type { AuthService } from '../client/auth.js';
import { Logger } from '../utils/logger.js';

export class AssetService {
  private logger: Logger;

  constructor(private auth: AuthService, debug: boolean = false) {
    this.logger = new Logger('AssetService', debug);
  }

  /**
   * Fetch all assets (boats) from /bookings page
   */
  async fetchAssets(): Promise<Asset[]> {
    this.logger.info('Fetching assets from /bookings page...');

    const html = await this.auth.get<string>('/bookings');
    const assets = this.parseAssets(html);

    this.logger.success(`Found ${assets.length} assets`);
    return assets;
  }

  /**
   * Parse assets from HTML
   */
  private parseAssets(html: string): Asset[] {
    const $ = cheerio.load(html);
    const assets: Asset[] = [];

    $('.card.card-hover').each((index, element) => {
      try {
        const $card = $(element);

        // Extract boat name
        const fullName = $card.find('.mr-3').first().text().trim();
        if (!fullName) {
          this.logger.debug(`Skipping card ${index}: no name found`);
          return;
        }

        // Extract boat ID from calendar link
        const calendarLink = $card.find('a[href*="/bookings/calendar/"]');
        const calendarUrl = calendarLink.attr('href') || '';
        const boatIdMatch = calendarUrl.match(/\/calendar\/(\d+)/);
        const boatId = boatIdMatch ? boatIdMatch[1] : null;

        if (!boatId) {
          this.logger.debug(`Skipping boat "${fullName}": no ID found`);
          return;
        }

        // Parse boat details from name
        const details = this.parseBoatName(fullName);

        const asset: Asset = {
          id: boatId,
          fullName: fullName,
          displayName: details.displayName,
          nickname: details.nickname,
          type: details.type,
          classification: details.classification,
          category: details.category,
          weight: details.weight,
          sweepCapable: details.sweepCapable,
          calendarUrl: calendarUrl,
          bookingUrl: `/bookings/${boatId}`,
        };

        // Validate against schema
        const validated = AssetSchema.parse(asset);
        assets.push(validated);

        if (assets.length <= 3) {
          this.logger.debug(`Asset ${assets.length}: ${asset.displayName}`, asset);
        }
      } catch (error) {
        this.logger.warn(`Error parsing boat card ${index}`, error);
      }
    });

    return assets;
  }

  /**
   * Parse boat name into structured data
   * Examples:
   * - "1X - Carmody single scull ( Go For Gold )"
   * - "2X RACER - Swift double/pair 70 KG (Ian Krix)"
   * - "4X - Ausrowtec coxed quad/four 90 KG Hunter"
   * - "2X/- RACER - Partridge 95 KG" (sweep capable)
   * - "Tinnie - 15HP (2010 Stacer Seasprite 359)" (tinnie)
   */
  private parseBoatName(fullName: string): {
    type: BoatType;
    classification: BoatClassification;
    category: BoatCategory;
    weight: string | null;
    sweepCapable: boolean;
    nickname: string;
    displayName: string;
  } {
    // Detect tinnies: "tinnie" keyword OR horsepower pattern (e.g., "15HP", "18HP")
    const isTinnie = /\btinnie\b/i.test(fullName) || /\d+\s*HP\b/i.test(fullName);
    const category: BoatCategory = isTinnie ? 'tinnie' : 'rowing';

    // Extract type and sweep capability (rowing boats only)
    // Matches: 1X, 2X, 4X, 8X with optional /+ or /-
    const typeMatch = fullName.match(/^(1X|2X|4X|8X)(\/[\+\-])?/);
    const type: BoatType = typeMatch ? (typeMatch[1] as BoatType) : 'Unknown';
    const sweepCapable = !!typeMatch && !!typeMatch[2]; // true if /+ or /- present

    // Extract classification (rowing boats only - tinnies don't have race/club distinction)
    const racerMatch = fullName.match(/RACER/i);
    const rtMatch = fullName.match(/\bRT\b/i);
    const classification: BoatClassification = racerMatch ? 'R' : rtMatch ? 'RT' : 'T';

    // Extract weight (kg for rowing boats)
    const weightMatch = fullName.match(/(\d+)\s*KG/i);
    const weight = weightMatch ? weightMatch[1] : null;

    // Extract nickname (text in parentheses)
    const nicknameMatch = fullName.match(/\(\s*([^)]+)\s*\)/);
    const nickname = nicknameMatch ? nicknameMatch[1].trim() : '';

    // Clean up display name
    let displayName = fullName;
    if (isTinnie) {
      // For tinnies: remove "Tinnie - " prefix and horsepower
      displayName = fullName
        .replace(/^Tinnie\s*-\s*/i, '')
        .replace(/\d+\s*HP\s*/i, '')
        .replace(/\([^)]*\)/, '')
        .replace(/\s+/g, ' ')
        .trim();
    } else {
      // For rowing boats: remove type, classification, weight, nickname
      displayName = fullName
        .replace(/^(1X|2X|4X|8X)(\/[\+\-])?\s*(-\s*)?/i, '') // Remove type and sweep indicator
        .replace(/\bRACER\b\s*-?\s*/i, '')
        .replace(/\b(RT|T)\b\s*-?\s*/i, '')
        .replace(/\d+\s*KG/i, '')
        .replace(/\([^)]*\)/, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return {
      type,
      classification,
      category,
      weight,
      sweepCapable,
      nickname,
      displayName,
    };
  }
}
