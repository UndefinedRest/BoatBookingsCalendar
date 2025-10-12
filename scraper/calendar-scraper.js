/**
 * RevolutioniseSport Calendar Data Scraper
 * 
 * Scrapes booking calendar data for each boat
 * Generates booking-calendar-data.json with member names and time slots
 */

const RevSportAuthenticator = require('../auth/revsport-auth');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class CalendarScraper {
    constructor(boats, config = {}) {
        this.boats = boats; // Array of boat objects from booking-config.json
        this.auth = new RevSportAuthenticator({
            baseUrl: config.baseUrl || process.env.REVSPORT_BASE_URL,
            username: config.username || process.env.REVSPORT_USERNAME,
            password: config.password || process.env.REVSPORT_PASSWORD,
            debug: config.debug || process.env.REVSPORT_DEBUG === 'true'
        });
        
        this.bookings = {};
        this.debug = config.debug || process.env.REVSPORT_DEBUG === 'true';
    }

    /**
     * Log helper
     */
    log(message, data = null) {
        console.log(`[CalendarScraper] ${message}`);
        if (data && this.debug) {
            console.log(JSON.stringify(data, null, 2));
        }
    }

    /**
     * Scrape calendar data for all boats
     */
    async scrapeAllCalendars() {
        try {
            this.log('Starting calendar scraping...');
            
            // Login once
            await this.auth.login();
            this.log('Authentication successful');
            
            // Scrape calendar for each boat
            for (let i = 0; i < this.boats.length; i++) {
                const boat = this.boats[i];
                try {
                    this.log(`Scraping calendar for boat ${i + 1}/${this.boats.length}: ${boat.displayName}`);
                    await this.scrapeBoatCalendar(boat);
                    
                    // Small delay to avoid hammering the server
                    await this.delay(200);
                } catch (error) {
                    console.error(`Failed to scrape calendar for boat ${boat.displayName}:`, error.message);
                }
            }
            
            this.log(`Scraping complete. Processed ${Object.keys(this.bookings).length} boats`);
            return this.bookings;
            
        } catch (error) {
            console.error('Calendar scraping failed:', error.message);
            throw error;
        }
    }

    /**
     * Scrape calendar for a single boat
     */
    async scrapeBoatCalendar(boat) {
        try {
            // Fetch the calendar page
            const html = await this.auth.get(`/bookings/calendar/${boat.id}`);
            
            // Parse bookings from the HTML
            const bookings = this.parseCalendarHTML(html, boat.id);
            
            // Store bookings indexed by boat ID
            this.bookings[boat.id] = {
                boatId: boat.id,
                boatName: boat.displayName,
                fullName: boat.fullName,
                bookings: bookings
            };
            
            this.log(`Found ${bookings.length} bookings for ${boat.displayName}`);
            
        } catch (error) {
            this.log(`Error scraping calendar for boat ${boat.id}:`, { error: error.message });
            throw error;
        }
    }

    /**
     * Parse booking data from calendar HTML
     */
    parseCalendarHTML(html, boatId) {
        const $ = cheerio.load(html);
        const bookings = [];

        // Find all columns with data-date attributes (fc-timegrid-col elements)
        $('td.fc-timegrid-col[data-date]').each((colIndex, colElement) => {
            const $column = $(colElement);
            const dateAttr = $column.attr('data-date');
            
            if (!dateAttr) {
                return; // Skip if no date attribute
            }
            
            // Find all event harnesses within this column
            $column.find('.fc-timegrid-event-harness').each((harIndex, harElement) => {
                try {
                    const $harness = $(harElement);
                    const $event = $harness.find('.fc-timegrid-event');
                    
                    if ($event.length === 0) {
                        return; // Skip if no event found
                    }
                    
                    // Extract time range from event
                    const timeText = $event.find('.fc-event-time').text().trim();
                    if (!timeText) {
                        this.log(`Warning: No time text found in event for date ${dateAttr}`);
                        return;
                    }
                    
                    // Parse time range (e.g., "06:30 - 07:30")
                    const timeMatch = timeText.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
                    if (!timeMatch) {
                        this.log(`Warning: Could not parse time "${timeText}" for date ${dateAttr}`);
                        return;
                    }
                    
                    const startTime = timeMatch[1];
                    const endTime = timeMatch[2];
                    
                    // Extract member name from title
                    const titleElement = $event.find('.fc-event-title');
                    const titleText = titleElement.text().trim();
                    const memberName = titleText.replace(/^Booked by\s*/i, '').trim();
                    
                    if (!memberName) {
                        this.log(`Warning: No member name found for ${dateAttr} ${startTime}-${endTime}`);
                        return;
                    }
                    
                    const booking = {
                        date: dateAttr,
                        startTime: startTime,
                        endTime: endTime,
                        memberName: memberName,
                        boatId: boatId
                    };
                    
                    bookings.push(booking);
                    
                    if (this.debug) {
                        this.log(`Found booking: ${dateAttr} ${startTime}-${endTime} by ${memberName}`);
                    }
                    
                } catch (error) {
                    this.log(`Error parsing booking event:`, { error: error.message, stack: error.stack });
                }
            });
        });

        return bookings;
    }

    /**
     * Generate calendar data file
     */
    async generateCalendarData() {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Start from Sunday
        
        // Generate 7-day view
        const days = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            days.push(this.formatDate(date));
        }

        const calendarData = {
            generatedAt: new Date().toISOString(),
            generatedAtReadable: new Date().toLocaleString('en-AU'),
            weekStart: this.formatDate(weekStart),
            weekEnd: this.formatDate(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)),
            days: days,
            boats: Object.values(this.bookings),
            totalBookings: Object.values(this.bookings).reduce((sum, boat) => sum + boat.bookings.length, 0),
            notes: "Auto-generated from RevolutioniseSport calendar scraper"
        };

        return calendarData;
    }

    /**
     * Save calendar data to file
     */
    async saveCalendarData(outputPath = 'booking-calendar-data.json') {
        try {
            const calendarData = await this.generateCalendarData();
            
            // Resolve full path
            const fullPath = path.resolve(outputPath);
            this.log(`Attempting to save calendar data to: ${fullPath}`);
            
            // Create directory if needed
            const dir = path.dirname(fullPath);
            await fs.mkdir(dir, { recursive: true });
            
            // Backup existing file
            try {
                const existing = await fs.readFile(fullPath, 'utf8');
                const backupPath = fullPath + '.backup.' + new Date().getTime();
                await fs.writeFile(backupPath, existing);
                this.log(`Backed up existing calendar data to ${backupPath}`);
            } catch (error) {
                this.log(`No existing calendar data to backup`);
            }
            
            // Write new calendar data
            const dataJson = JSON.stringify(calendarData, null, 2);
            await fs.writeFile(fullPath, dataJson);
            this.log(`Calendar data saved successfully to ${fullPath}`);
            
            // Verify file
            const stats = await fs.stat(fullPath);
            this.log(`File verified - size: ${stats.size} bytes`);
            
            // Display summary
            console.log('\n' + '='.repeat(60));
            console.log('CALENDAR SCRAPING SUMMARY');
            console.log('='.repeat(60));
            console.log(`Week: ${calendarData.weekStart} to ${calendarData.weekEnd}`);
            console.log(`Total bookings found: ${calendarData.totalBookings}`);
            console.log(`Boats with bookings: ${calendarData.boats.filter(b => b.bookings.length > 0).length}/${calendarData.boats.length}`);
            console.log(`Calendar data file: ${fullPath}`);
            console.log(`Generated: ${calendarData.generatedAtReadable}`);
            console.log('='.repeat(60) + '\n');
            
            // Show sample bookings
            const bookingsWithData = calendarData.boats.filter(b => b.bookings.length > 0);
            if (bookingsWithData.length > 0) {
                console.log('Sample bookings (first 10):');
                let count = 0;
                for (const boat of bookingsWithData) {
                    for (const booking of boat.bookings.slice(0, 10 - count)) {
                        console.log(`  - ${boat.boatName}: ${booking.date} ${booking.startTime}-${booking.endTime} (${booking.memberName})`);
                        count++;
                        if (count >= 10) break;
                    }
                    if (count >= 10) break;
                }
            }
            
            return fullPath;
            
        } catch (error) {
            console.error('Failed to save calendar data:', error.message);
            throw error;
        }
    }

    /**
     * Helper: Format date as YYYY-MM-DD
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Helper: Delay utility
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Main execution
 */
async function main() {
    try {
        // Load boat configuration
        const configPath = 'booking-config.json';
        const configFile = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configFile);
        
        const scraper = new CalendarScraper(config.boats, {
            debug: process.env.REVSPORT_DEBUG === 'true'
        });

        // Scrape all calendars
        await scraper.scrapeAllCalendars();
        
        // Save calendar data
        await scraper.saveCalendarData('booking-calendar-data.json');
        
        console.log('✓ Calendar scraping completed successfully!');
        
    } catch (error) {
        console.error('✗ Calendar scraping failed:', error.message);
        process.exit(1);
    }
}

// Export for use in other modules
module.exports = CalendarScraper;

// Run if executed directly
if (require.main === module) {
    main();
}