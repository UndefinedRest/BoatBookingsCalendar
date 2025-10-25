/**
 * Type definitions for LMRC Booking System
 */

export type BoatType = '1X' | '2X' | '4X' | '8X' | 'Unknown';
export type BoatClassification = 'T' | 'R' | 'RT';
export type SessionType = 'morning1' | 'morning2' | 'custom';
export type DataFreshness = 'fresh' | 'stale' | 'cached';

export interface Asset {
  id: string;
  fullName: string;
  displayName: string;
  nickname: string;
  type: BoatType;
  classification: BoatClassification;
  weight: string | null;
  calendarUrl: string;
  bookingUrl: string;
}

export interface RawBooking {
  id?: string;
  title: string;
  start: string;
  end: string;
  url?: string;
  extendedProps?: {
    newWindow?: boolean;
  };
}

export interface Booking {
  date: string;
  startTime: string;
  endTime: string;
  memberName: string;
  boatId: string;
  session: SessionType;
  isValidSession: boolean;
}

export interface SessionConfig {
  start: string;
  end: string;
}

export interface Sessions {
  morning1: SessionConfig;
  morning2: SessionConfig;
}

export interface BoatWithBookings extends Asset {
  bookings: Booking[];
  availability: {
    availableSlots: number;
    totalSlots: number;
    utilizationPercent: number;
  };
}

export interface WeeklyBookingView {
  metadata: {
    generatedAt: Date;
    weekStart: Date;
    weekEnd: Date;
    totalBoats: number;
    totalBookings: number;
    dataFreshness: {
      assets: DataFreshness;
      bookings: DataFreshness;
    };
  };
  sessions: Sessions;
  boats: BoatWithBookings[];
  warnings: Warning[];
}

export interface Warning {
  boatId: string;
  boatName: string;
  issue: string;
  details: any;
}

export interface Config {
  baseUrl: string;
  username: string;
  password: string;
  debug: boolean;
  sessions: Sessions;
}
