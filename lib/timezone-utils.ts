/**
 * Timezone Utilities
 * Proper timezone handling using date-fns-tz to avoid common pitfalls
 *
 * Key principle: Store all times in UTC ISO strings in database,
 * only convert to local timezone for display/calculation at boundaries
 */

import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

/**
 * Get the current time in a specific timezone
 * Returns a Date object representing the actual current moment
 * (not for storage - database should always get UTC)
 */
export function getNowInTimezone(timezone: string): Date {
  // Get the current UTC time
  const utcDate = new Date();
  // Convert to zoned time (this keeps the same moment, just with timezone context)
  return toZonedTime(utcDate, timezone);
}

/**
 * Get today's date at midnight in a specific timezone
 * Used for scheduling calculations
 * Returns a Date object in UTC that represents midnight in the given timezone
 */
export function getTodayAtMidnightUTC(timezone: string): Date {
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);

  // Create a new date with same year/month/day but at midnight
  const todayAtMidnight = new Date(
    zonedNow.getFullYear(),
    zonedNow.getMonth(),
    zonedNow.getDate(),
    0,
    0,
    0,
    0
  );

  // Convert back to UTC
  const utcMidnight = fromZonedTime(todayAtMidnight, timezone);
  return utcMidnight;
}

/**
 * Create a scheduled time in a specific timezone and return as UTC ISO string
 *
 * @param timeString - Time in HH:MM format (e.g., "08:00", "14:30")
 * @param timezone - Timezone (e.g., "Australia/Sydney")
 * @param dateOffset - Days to add to today (0 = today, 1 = tomorrow)
 * @returns ISO 8601 UTC string ready for database storage
 */
export function createScheduledTimeUTC(
  timeString: string,
  timezone: string,
  dateOffset: number = 0
): Date {
  const [hours, minutes] = timeString.split(':').map(Number);

  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error(`Invalid time format: ${timeString}. Use HH:MM`);
  }

  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);

  // Create target date with specified hours/minutes
  const targetDate = new Date(
    zonedNow.getFullYear(),
    zonedNow.getMonth(),
    zonedNow.getDate() + dateOffset,
    hours,
    minutes,
    0,
    0
  );

  // Convert from local timezone to UTC
  const utcDate = fromZonedTime(targetDate, timezone);
  return utcDate;
}

/**
 * Check if it's time to take an action based on configured posting times
 *
 * @param postingTimes - Array of times in HH:MM format
 * @param timezone - Timezone to check time in
 * @param windowMinutes - How many minutes before/after posting time to consider valid
 * @returns true if current time matches any posting time (within window)
 */
export function isTimeToPost(
  postingTimes: string[],
  timezone: string,
  windowMinutes: number = 30
): boolean {
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  const currentHours = zonedNow.getHours();
  const currentMinutes = zonedNow.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  for (const timeStr of postingTimes) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const targetTotalMinutes = hours * 60 + minutes;

    // Check if current time is within window of target time
    const diff = Math.abs(currentTotalMinutes - targetTotalMinutes);
    if (diff <= windowMinutes) {
      return true;
    }
  }

  return false;
}

/**
 * Format a UTC ISO date for display in a specific timezone
 *
 * @param isoString - ISO 8601 UTC string from database
 * @param timezone - Timezone to display in
 * @param formatStr - date-fns format string (default: "HH:mm yyyy-MM-dd")
 * @returns Formatted string
 */
export function formatDateInTimezone(
  isoString: string,
  timezone: string,
  formatStr: string = 'HH:mm yyyy-MM-dd'
): string {
  try {
    const date = new Date(isoString);
    return formatInTimeZone(date, timezone, formatStr);
  } catch (error) {
    console.error('[formatDateInTimezone] Error formatting date:', error);
    return isoString;
  }
}

/**
 * Get current time as HH:MM string in a specific timezone
 * Useful for logging and display
 */
export function getCurrentTimeInTimezone(timezone: string): string {
  try {
    const now = new Date();
    return formatInTimeZone(now, timezone, 'HH:mm');
  } catch (error) {
    console.error('[getCurrentTimeInTimezone] Error:', error);
    return 'HH:MM';
  }
}

/**
 * Get the hours to next posting time
 * Useful for determining when automation should run next
 */
export function getHoursUntilNextPostTime(
  postingTimes: string[],
  timezone: string
): number {
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  const currentHours = zonedNow.getHours();
  const currentMinutes = zonedNow.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  // Convert all posting times to minutes since midnight
  const postingMinutes = postingTimes
    .map(timeStr => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    })
    .sort((a, b) => a - b);

  // Find next posting time
  let nextMinutes = null;
  for (const postMinutes of postingMinutes) {
    if (postMinutes > currentTotalMinutes) {
      nextMinutes = postMinutes;
      break;
    }
  }

  // If no posting time found today, use first time tomorrow
  if (nextMinutes === null) {
    nextMinutes = postingMinutes[0] + 24 * 60;
  }

  const minutesUntilNext = nextMinutes - currentTotalMinutes;
  return minutesUntilNext / 60;
}

/**
 * Check if a scheduled time has passed (in the given timezone)
 *
 * @param scheduledForISO - ISO 8601 UTC string
 * @param timezone - Timezone context
 * @returns true if scheduled time is in the past
 */
export function hasScheduledTimePassed(
  scheduledForISO: string,
  timezone: string
): boolean {
  const scheduledUTC = new Date(scheduledForISO);
  const nowUTC = new Date();
  return scheduledUTC < nowUTC;
}

/**
 * Get next fetch time for periodic checks (e.g., 6-hour intervals)
 * Anchored to UTC hour boundaries (0, 6, 12, 18)
 */
export function getNextFetchTime(intervalHours: number = 6): Date {
  const now = new Date();
  const currentHour = now.getUTCHours();

  // Find next interval boundary
  let nextHour = Math.ceil(currentHour / intervalHours) * intervalHours;
  if (nextHour >= 24) {
    nextHour = 0; // Wrap to tomorrow
  }

  const next = new Date(now);
  next.setUTCHours(nextHour, 0, 0, 0);

  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next;
}

/**
 * Should we run a periodic task at this UTC hour?
 * Useful for 6-hour check intervals
 */
export function shouldRunAtUTCHour(allowedHours: number[]): boolean {
  const now = new Date();
  const hour = now.getUTCHours();
  const minutes = now.getUTCMinutes();

  // Run if we're within first 10 minutes of the hour
  return allowedHours.includes(hour) && minutes < 10;
}
