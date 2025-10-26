/**
 * Investigation script to see what boat information is available from RevSport
 */

import { AuthService } from './src/client/auth.js';
import { getConfig } from './src/config/config.js';
import * as cheerio from 'cheerio';
import fs from 'fs';

async function investigateBoatInfo() {
  const config = getConfig();
  const auth = new AuthService(config);

  console.log('🔐 Authenticating...');
  await auth.login();

  // Note: The admin portal URL (portal.revolutionise.com.au) is different from the booking system
  // We'll investigate pages we can actually access

  console.log('\n📋 Skipping admin portal (different domain)...');
  console.log('   Admin URL: https://portal.revolutionise.com.au/lmrc2019/assets/edit/5439');
  console.log('   Booking URL: https://www.lakemacquarierowingclub.org.au');
  console.log('');

  // Fetch the bookings list page to see what's available there
  console.log('\n' + '='.repeat(80));
  console.log('BOAT INFORMATION AVAILABLE FROM BOOKINGS LIST PAGE');
  console.log('='.repeat(80));

  const bookingsPageHtml = await auth.get('/bookings');
  fs.writeFileSync('boat-bookings-page.html', bookingsPageHtml);

  const $bookings = cheerio.load(bookingsPageHtml);

  // Find the specific boat card for 6283
  let boatCard = null;
  $bookings('.card.card-hover').each((i, el) => {
    const $card = $bookings(el);
    const calendarLink = $card.find('a[href*="/bookings/calendar/"]');
    const href = calendarLink.attr('href') || '';
    if (href.includes('/calendar/6283')) {
      boatCard = $card;
    }
  });

  if (boatCard) {
    console.log('\n📋 BOOKINGS PAGE CARD DATA:\n');

    // Get all text content
    const cardText = boatCard.text();
    console.log('Card text content:');
    console.log(cardText.replace(/\s+/g, ' ').trim());
    console.log('');

    // Get all links
    console.log('Links in card:');
    boatCard.find('a').each((i, el) => {
      const href = $bookings(el).attr('href');
      const text = $bookings(el).text().trim();
      console.log(`  ${text}: ${href}`);
    });
    console.log('');

    // Get any images
    const cardImages = boatCard.find('img');
    if (cardImages.length > 0) {
      console.log('Images in card:');
      cardImages.each((i, el) => {
        const src = $bookings(el).attr('src');
        const alt = $bookings(el).attr('alt');
        console.log(`  ${alt || 'Image'}: ${src}`);
      });
    }

    // Get any badges or labels
    console.log('\nBadges/Labels:');
    boatCard.find('.badge, .label, span[class*="badge"]').each((i, el) => {
      const text = $bookings(el).text().trim();
      const className = $bookings(el).attr('class');
      console.log(`  ${text} (${className})`);
    });
  }

  // Check calendar page for more info
  console.log('\n' + '='.repeat(80));
  console.log('BOAT INFORMATION AVAILABLE FROM CALENDAR PAGE');
  console.log('='.repeat(80));

  const calendarPageHtml = await auth.get('/bookings/calendar/6283');
  fs.writeFileSync('boat-calendar-page.html', calendarPageHtml);

  const $calendar = cheerio.load(calendarPageHtml);

  console.log('\n📅 CALENDAR PAGE DATA:\n');

  // Page title
  const title = $calendar('title').text();
  console.log(`Page title: ${title}`);

  // Main heading
  const heading = $calendar('h1, h2, h3').first().text().trim();
  console.log(`Main heading: ${heading}`);

  // Look for boat details section
  const detailsSection = $calendar('.boat-details, .asset-details, .card-body');
  if (detailsSection.length > 0) {
    console.log('\nDetails section:');
    console.log(detailsSection.first().text().replace(/\s+/g, ' ').trim().substring(0, 500));
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log('\nInformation currently captured from bookings system:');
  console.log('  ✓ Boat ID (6283)');
  console.log('  ✓ Full name from bookings list');
  console.log('  ✓ Display name (parsed)');
  console.log('  ✓ Nickname (parsed from parentheses)');
  console.log('  ✓ Type (1X, 2X, etc.)');
  console.log('  ✓ Classification (Racer/RT/Training)');
  console.log('  ✓ Weight class (if specified)');
  console.log('  ✓ Booking availability data');
  console.log('');
  console.log('Limitation: Admin portal (portal.revolutionise.com.au) is a separate domain');
  console.log('           Cannot access asset management pages without separate authentication');
  console.log('');
  console.log('Files saved for detailed inspection:');
  console.log('  - boat-bookings-page.html');
  console.log('  - boat-calendar-page.html');
}

investigateBoatInfo().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
