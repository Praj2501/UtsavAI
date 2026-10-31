/**
 * Timeline lead days and documented Panic Mode transition rules.
 */

export const TIMELINE_CONSTANTS = {
  IDEAL_LEAD_TIME_DAYS: 90,
  CRITICAL_THRESHOLD_DAYS: 30,
  EMERGENCY_THRESHOLD_DAYS: 7,
} as const;

/**
 * Deterministic Panic Mode transition lookup rule table.
 * Used by compressTimeline() when available days to event < IDEAL_LEAD_TIME_DAYS.
 */
export const PANIC_RULES = {
  EMERGENCY: {
    maxDaysRemaining: 7,
    high: 'do_now',
    medium: 'outsource',
    low: 'skip',
  },
  CRITICAL: {
    maxDaysRemaining: 30,
    high: 'do_now',
    medium: 'do_now',
    low: 'outsource',
  },
  COMPRESSED: {
    maxDaysRemaining: 90,
    overdueHigh: 'do_now',
    overdueMedium: 'do_now',
    overdueLow: 'outsource',
    onTrack: 'normal',
  },
} as const;
