/**
 * LMRC Booking Viewer
 * Main entry point
 */

import { writeFile } from 'fs/promises';
import { config } from './config/config.js';
import { AuthService } from './client/auth.js';
import { AssetService } from './services/assetService.js';
import { BookingService } from './services/bookingService.js';
import { Logger } from './utils/logger.js';
import type { WeeklyBookingView, Warning } from './models/types.js';

const logger = new Logger('Main', config.debug);

/**
 * Main function - orchestrates the booking fetch
 */
async function main() {
  try {
    console.log('='.repeat(80));
    console.log('LMRC BOOKING VIEWER - 7 DAY VIEW');
    console.log('='.repeat(80));
    console.log('');

    const startTime = Date.now();

    // Step 1: Authentication
    logger.info('Step 1: Authenticating...');
    const auth = new AuthService(config);
    await auth.login();
    console.log('');

    // Step 2: Fetch all assets (boats)
    logger.info('Step 2: Fetching assets...');
    const assetService = new AssetService(auth, config.debug);
    const assets = await assetService.fetchAssets();
    console.log('');

    // Step 3: Fetch bookings for all assets (parallel)
    logger.info('Step 3: Fetching bookings...');
    const bookingService = new BookingService(auth, config.sessions, config.debug);
    const boatsWithBookings = await bookingService.fetchAllBookings(assets);
    console.log('');

    // Step 4: Generate weekly view
    logger.info('Step 4: Generating weekly view...');
    const weeklyView = generateWeeklyView(boatsWithBookings);

    // Step 5: Save output
    logger.info('Step 5: Saving output...');
    await saveOutput(weeklyView);

    const duration = Date.now() - startTime;

    // Summary
    console.log('');
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total boats: ${weeklyView.metadata.totalBoats}`);
    console.log(`Total bookings: ${weeklyView.metadata.totalBookings}`);
    console.log(`Bookings outside standard sessions: ${weeklyView.warnings.length}`);
    console.log(`Week: ${weeklyView.metadata.weekStart.toISOString().split('T')[0]} to ${weeklyView.metadata.weekEnd.toISOString().split('T')[0]}`);
    console.log(`Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.log('='.repeat(80));

    if (weeklyView.warnings.length > 0) {
      console.log('');
      console.log('⚠ Warnings:');
      weeklyView.warnings.forEach((warning) => {
        console.log(`  - ${warning.boatName}: ${warning.issue}`);
      });
    }

    console.log('');
    logger.success('✓ Complete! Output saved to weekly-bookings.json');
  } catch (error) {
    logger.error('Failed to fetch bookings', error);
    process.exit(1);
  }
}

/**
 * Generate weekly booking view
 */
function generateWeeklyView(boatsWithBookings: any[]): WeeklyBookingView {
  const now = new Date();
  // Match the date range used in booking service: today + 7 days
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);

  // Collect warnings for bookings outside standard sessions
  const warnings: Warning[] = [];

  boatsWithBookings.forEach((boat) => {
    boat.bookings.forEach((booking: any) => {
      if (!booking.isValidSession) {
        warnings.push({
          boatId: boat.id,
          boatName: boat.displayName,
          issue: `Booking outside standard sessions: ${booking.date} ${booking.startTime}-${booking.endTime}`,
          details: booking,
        });
      }
    });
  });

  const totalBookings = boatsWithBookings.reduce(
    (sum, boat) => sum + boat.bookings.length,
    0
  );

  return {
    metadata: {
      generatedAt: now,
      weekStart,
      weekEnd,
      totalBoats: boatsWithBookings.length,
      totalBookings,
      dataFreshness: {
        assets: 'fresh',
        bookings: 'fresh',
      },
    },
    sessions: config.sessions,
    boats: boatsWithBookings,
    warnings,
  };
}

/**
 * Save output to JSON file
 */
async function saveOutput(view: WeeklyBookingView): Promise<void> {
  const filename = 'weekly-bookings.json';

  // Custom replacer to handle Date objects
  const json = JSON.stringify(view, null, 2);

  await writeFile(filename, json, 'utf-8');
  logger.info(`Saved to ${filename}`);

  // Also save a human-readable summary
  const summary = generateSummary(view);
  await writeFile('weekly-bookings-summary.txt', summary, 'utf-8');
  logger.info('Saved summary to weekly-bookings-summary.txt');
}

/**
 * Generate human-readable summary
 */
function generateSummary(view: WeeklyBookingView): string {
  const lines: string[] = [];

  lines.push('LMRC WEEKLY BOOKING SUMMARY');
  lines.push('='.repeat(80));
  lines.push('');
  lines.push(`Generated: ${view.metadata.generatedAt.toISOString()}`);
  lines.push(
    `Week: ${view.metadata.weekStart.toISOString().split('T')[0]} to ${view.metadata.weekEnd.toISOString().split('T')[0]}`
  );
  lines.push('');
  lines.push(`Total Boats: ${view.metadata.totalBoats}`);
  lines.push(`Total Bookings: ${view.metadata.totalBookings}`);
  lines.push('');

  lines.push('SESSION TIMES');
  lines.push('-'.repeat(80));
  lines.push(`Morning 1: ${view.sessions.morning1.start} - ${view.sessions.morning1.end}`);
  lines.push(`Morning 2: ${view.sessions.morning2.start} - ${view.sessions.morning2.end}`);
  lines.push('');

  lines.push('BOATS WITH BOOKINGS');
  lines.push('-'.repeat(80));

  const boatsWithBookings = view.boats.filter((b) => b.bookings.length > 0);

  if (boatsWithBookings.length === 0) {
    lines.push('No bookings found for this week.');
  } else {
    boatsWithBookings.forEach((boat) => {
      lines.push(`\n${boat.displayName} (${boat.type}) - ${boat.bookings.length} bookings`);
      lines.push(`  Utilization: ${boat.availability.utilizationPercent}%`);

      boat.bookings.forEach((booking) => {
        const sessionMarker = booking.isValidSession ? '✓' : '⚠';
        lines.push(
          `  ${sessionMarker} ${booking.date} ${booking.startTime}-${booking.endTime} - ${booking.memberName}`
        );
      });
    });
  }

  if (view.warnings.length > 0) {
    lines.push('');
    lines.push('');
    lines.push('WARNINGS');
    lines.push('-'.repeat(80));
    view.warnings.forEach((warning) => {
      lines.push(`⚠ ${warning.boatName}: ${warning.issue}`);
    });
  }

  return lines.join('\n');
}

// Run main function
main();
