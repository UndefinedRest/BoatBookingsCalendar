/**
 * Boat Grouping and Sorting Service
 * Groups boats by type and sorts them for display
 */

import { getClubConfig } from '../config/club.js';

export interface BoatWithBookings {
  id: string;
  fullName: string;
  displayName: string;
  type: string;
  bookings: Array<{
    date: string;
    startTime: string;
    endTime: string;
    memberName: string;
    isValidSession: boolean;
  }>;
}

export interface GroupedBoats {
  singles: BoatWithBookings[];
  doubles: BoatWithBookings[];
  quads: BoatWithBookings[];
  other: BoatWithBookings[];
}

/**
 * Determine boat group from boat type
 */
function getBoatGroup(boatType: string): 'singles' | 'doubles' | 'quads' | 'other' {
  const config = getClubConfig();
  const type = boatType.toUpperCase();

  if (config.boatGroups.singles.some(pattern => type.includes(pattern))) {
    return 'singles';
  }
  if (config.boatGroups.doubles.some(pattern => type.includes(pattern))) {
    return 'doubles';
  }
  if (config.boatGroups.quads.some(pattern => type.includes(pattern))) {
    return 'quads';
  }
  return 'other';
}

/**
 * Sort boats alphabetically by display name
 */
function sortBoats(boats: BoatWithBookings[]): BoatWithBookings[] {
  return boats.sort((a, b) => {
    return a.displayName.localeCompare(b.displayName);
  });
}

/**
 * Group boats by type (Singles, Doubles, Quads) and sort within groups
 */
export function groupAndSortBoats(boats: BoatWithBookings[]): GroupedBoats {
  const grouped: GroupedBoats = {
    singles: [],
    doubles: [],
    quads: [],
    other: [],
  };

  // Group boats
  for (const boat of boats) {
    const group = getBoatGroup(boat.type);
    grouped[group].push(boat);
  }

  // Sort each group alphabetically
  return {
    singles: sortBoats(grouped.singles),
    doubles: sortBoats(grouped.doubles),
    quads: sortBoats(grouped.quads),
    other: sortBoats(grouped.other),
  };
}

/**
 * Flatten grouped boats into display order
 * Order: Quads → Doubles → Singles → Other
 */
export function flattenGroupedBoats(grouped: GroupedBoats): BoatWithBookings[] {
  return [
    ...grouped.quads,
    ...grouped.doubles,
    ...grouped.singles,
    ...grouped.other,
  ];
}
