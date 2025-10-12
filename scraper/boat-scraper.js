/**
 * RevolutioniseSport Boat Data Scraper
 * 
 * Authenticates with RevSport and scrapes boat information
 * Generates booking-config.json for the booking display system
 */

const RevSportAuthenticator = require('../auth/revsport-auth');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class BoatScraper {
    constructor(config = {}) {
        this.auth = new RevSportAuthenticator({
            baseUrl: config.baseUrl || process.env.REVSPORT_BASE_URL,
            username: config.username || process.env.REVSPORT_USERNAME,
            password: config.password || process.env.REVSPORT_PASSWORD,
            debug: config.debug || process.env.REVSPORT_DEBUG === 'true'
        });
        
        this.boats = [];
        this.debug = config.debug || process.env.REVSPORT_DEBUG === 'true';
    }

    /**
     * Log helper
     */
    log(message, data = null) {
        console.log(`[BoatScraper] ${message}`);
        if (data && this.debug) {
            console.log(JSON.stringify(data, null, 2));
        }
    }

    /**
     * Scrape boat data from bookings page
     */
    async scrapeBoats() {
        try {
            this.log('Starting boat data scraping...');
            
            // Login
            await this.auth.login();
            this.log('Authentication successful');
            
            // Fetch bookings page
            this.log('Fetching bookings page...');
            const html = await this.auth.get('/bookings');
            
            // Parse boat data
            this.log('Parsing boat data from HTML...');
            this.parseBoatData(html);
            
            this.log(`Successfully scraped ${this.boats.length} boats`);
            return this.boats;
            
        } catch (error) {
            console.error('Scraping failed:', error.message);
            throw error;
        }
    }

    /**
     * Parse boat data from HTML
     */
    parseBoatData(html) {
        const $ = cheerio.load(html);
        this.boats = [];
        let count = 0;

        $('.card.card-hover').each((index, element) => {
            const $card = $(element);
            
            try {
                // Extract boat name
                const nameDiv = $card.find('.mr-3').first();
                const fullName = nameDiv.text().trim();
                
                if (!fullName) {
                    this.log(`Skipping card ${index}: no name found`);
                    return;
                }
                
                // Extract boat ID from calendar link
                const calendarLink = $card.find('a[href*="/bookings/calendar/"]');
                const calendarUrl = calendarLink.attr('href');
                const boatIdMatch = calendarUrl ? calendarUrl.match(/\/calendar\/(\d+)/) : null;
                const boatId = boatIdMatch ? boatIdMatch[1] : null;
                
                if (!boatId) {
                    this.log(`Skipping boat "${fullName}": no ID found`);
                    return;
                }

                // Parse boat details from name
                const boatDetails = this.parseBoatName(fullName);

                const boat = {
                    id: boatId,
                    fullName: fullName,
                    displayName: boatDetails.displayName,
                    nickname: boatDetails.nickname,
                    type: boatDetails.type,
                    classification: boatDetails.classification,
                    weight: boatDetails.weight,
                    calendarUrl: calendarUrl || '',
                    bookingUrl: `/bookings/${boatId}`
                };
                
                this.boats.push(boat);
                count++;
                
                if (this.debug && count <= 3) {
                    this.log(`Boat ${count}: ${boat.displayName}`, boat);
                }
                
            } catch (error) {
                this.log(`Error parsing boat card ${index}: ${error.message}`);
            }
        });

        this.log(`Parsed ${this.boats.length} boats from HTML`);
    }

    /**
     * Parse boat name into structured data
     */
    parseBoatName(fullName) {
        // Example formats:
        // "1X - Euro single scull ( Jono Hunter )"
        // "2X RACER - Swift double/pair 70 KG (Ian Krix)"
        // "4X - Ausrowtec coxed quad/four 90 KG Hunter"
        
        const typeMatch = fullName.match(/^(1X|2X|4X|8X)/);
        const type = typeMatch ? typeMatch[1] : 'Unknown';
        
        const racerMatch = fullName.match(/RACER/i);
        const rtMatch = fullName.match(/\bRT\b/i);
        const classification = racerMatch ? 'R' : rtMatch ? 'RT' : 'T';
        
        const weightMatch = fullName.match(/(\d+)\s*KG/i);
        const weight = weightMatch ? weightMatch[1] : null;
        
        const nicknameMatch = fullName.match(/\(\s*([^)]+)\s*\)/);
        const nickname = nicknameMatch ? nicknameMatch[1].trim() : '';
        
        // Remove classification, type, and nickname to get display name
        let displayName = fullName
            .replace(/^(1X|2X|4X|8X)\s*(-\s*)?/i, '')
            .replace(/\bRACER\b\s*-?\s*/i, '')
            .replace(/\b(RT|T)\b\s*-?\s*/i, '')
            .replace(/\d+\s*KG/i, '')
            .replace(/\([^)]*\)/, '')
            .replace(/\s+/g, ' ')
            .trim();

        return {
            type,
            classification,
            weight,
            nickname,
            displayName
        };
    }

    /**
     * Generate configuration file
     */
    async generateConfig(timeSlots = null) {
        const defaultTimeSlots = [
            {
                label: "Morning 1",
                startTime: "06:00",
                endTime: "08:00"
            },
            {
                label: "Morning 2",
                startTime: "08:00",
                endTime: "10:00"
            }
        ];

        const config = {
            timeSlots: timeSlots || defaultTimeSlots,
            boats: this.boats,
            lastUpdated: new Date().toISOString(),
            lastUpdatedReadable: new Date().toLocaleString('en-AU'),
            notes: "Auto-generated from RevolutioniseSport scraper"
        };

        return config;
    }

    /**
     * Save configuration to file
     */
    async saveConfig(configPath = 'booking-config.json') {
        try {
            const config = await this.generateConfig();
            
            // Resolve full path
            const fullPath = path.resolve(configPath);
            this.log(`Attempting to save config to: ${fullPath}`);
            
            // Create directory if it doesn't exist
            const dir = path.dirname(fullPath);
            this.log(`Ensuring directory exists: ${dir}`);
            await fs.mkdir(dir, { recursive: true });
            this.log(`Directory ready`);
            
            // Backup existing config
            try {
                const existing = await fs.readFile(fullPath, 'utf8');
                const backupPath = fullPath + '.backup.' + new Date().getTime();
                await fs.writeFile(backupPath, existing);
                this.log(`Backed up existing config to ${backupPath}`);
            } catch (error) {
                // No existing config to backup
                this.log(`No existing config to backup`);
            }
            
            // Write new config
            const configJson = JSON.stringify(config, null, 2);
            this.log(`Writing ${configJson.length} bytes to file...`);
            await fs.writeFile(fullPath, configJson);
            this.log(`Configuration saved successfully to ${fullPath}`);
            
            // Verify file was written
            try {
                const stats = await fs.stat(fullPath);
                this.log(`File verified - size: ${stats.size} bytes`);
            } catch (error) {
                throw new Error(`File written but could not verify: ${error.message}`);
            }
            
            // Display summary
            console.log('\n' + '='.repeat(60));
            console.log('SCRAPING SUMMARY');
            console.log('='.repeat(60));
            console.log(`Total boats scraped: ${this.boats.length}`);
            console.log(`Configuration file: ${fullPath}`);
            console.log(`Last updated: ${config.lastUpdatedReadable}`);
            console.log('='.repeat(60) + '\n');
            
            // Show breakdown by type
            const typeBreakdown = {};
            this.boats.forEach(boat => {
                typeBreakdown[boat.type] = (typeBreakdown[boat.type] || 0) + 1;
            });
            
            console.log('Boats by type:');
            Object.entries(typeBreakdown).forEach(([type, count]) => {
                console.log(`  ${type}: ${count}`);
            });
            
            // Show breakdown by classification
            const classBreakdown = {};
            this.boats.forEach(boat => {
                classBreakdown[boat.classification] = (classBreakdown[boat.classification] || 0) + 1;
            });
            
            console.log('\nBoats by classification:');
            Object.entries(classBreakdown).forEach(([cls, count]) => {
                console.log(`  ${cls}: ${count}`);
            });
            
            console.log('\nSample boats (first 5):');
            this.boats.slice(0, 5).forEach(boat => {
                console.log(`  - ${boat.displayName} (${boat.type}, ${boat.classification})`);
            });
            
            return fullPath;
            
        } catch (error) {
            console.error('Failed to save configuration:', error.message);
            console.error('Error details:', error);
            throw error;
        }
    }
}

/**
 * Main execution
 */
async function main() {
    const scraper = new BoatScraper({
        debug: process.env.REVSPORT_DEBUG === 'true'
    });

    try {
        // Scrape boats
        await scraper.scrapeBoats();
        
        // Save configuration
        await scraper.saveConfig('booking-config.json');
        
        console.log('✓ Boat scraping completed successfully!');
        
    } catch (error) {
        console.error('✗ Scraping failed:', error.message);
        process.exit(1);
    }
}

// Export for use in other modules
module.exports = BoatScraper;

// Run if executed directly
if (require.main === module) {
    main();
}