const path = require('path');
const fs = require('fs');

console.log('Current working directory:', process.cwd());
console.log('Script location:', __filename);

const scraperPath = path.join(__dirname, 'scraper', 'calendar-scraper.js');
console.log('Looking for scraper at:', scraperPath);
console.log('File exists:', fs.existsSync(scraperPath));

if (fs.existsSync(scraperPath)) {
    console.log('File contents (first 100 chars):');
    const content = fs.readFileSync(scraperPath, 'utf8');
    console.log(content.substring(0, 100));
    
    try {
        const CalendarScraper = require('./scraper/calendar-scraper');
        console.log('Successfully loaded CalendarScraper module');
    } catch (error) {
        console.error('Error requiring CalendarScraper:', error.message);
        console.error('Full error:', error);
    }
}