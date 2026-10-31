import { DietaryPreference, EventType } from '../types/event.types';
import { CATERING_METRICS } from '../constants/budget.constants';

export interface CateringEstimate {
  effectiveGuests: number;
  bufferPercent: number;
  appetizerPieces: number;
  mainCourseRiceKg: number;
  breadPieces: number;
  dalCurryLiters: number;
  dessertPieces: number;
  beverageLiters: number;
  dietaryBreakdown: Record<DietaryPreference, number>;
}

/**
 * Calculates catering quantities and raw ingredient guidance from guest counts and dietary breakdown.
 * Applies standard Indian celebratory feast portions with a 7% safety buffer, rounded up to whole units.
 */
export function cateringQuantities(
  guestCount: number,
  dietaryCounts: Record<DietaryPreference, number>,
  _eventType: EventType,
  rsvpAttendingCount?: number
): CateringEstimate {
  const effectiveGuests = Math.max(0, rsvpAttendingCount !== undefined && rsvpAttendingCount > 0
    ? rsvpAttendingCount
    : guestCount);

  if (effectiveGuests === 0) {
    return {
      effectiveGuests: 0,
      bufferPercent: CATERING_METRICS.CONTINGENCY_BUFFER_PERCENT,
      appetizerPieces: 0,
      mainCourseRiceKg: 0,
      breadPieces: 0,
      dalCurryLiters: 0,
      dessertPieces: 0,
      beverageLiters: 0,
      dietaryBreakdown: { veg: 0, jain_veg: 0, non_veg: 0, vegan: 0 },
    };
  }

  const multiplier = 1 + (CATERING_METRICS.CONTINGENCY_BUFFER_PERCENT / 100);

  return {
    effectiveGuests,
    bufferPercent: CATERING_METRICS.CONTINGENCY_BUFFER_PERCENT,
    appetizerPieces: Math.ceil(effectiveGuests * CATERING_METRICS.PER_GUEST_APPETIZERS_PIECES * multiplier),
    mainCourseRiceKg: Math.round(((effectiveGuests * CATERING_METRICS.PER_GUEST_MAIN_GRAIN_GRAMS * multiplier) / 1000) * 10) / 10,
    breadPieces: Math.ceil(effectiveGuests * CATERING_METRICS.PER_GUEST_BREAD_PIECES * multiplier),
    dalCurryLiters: Math.round(((effectiveGuests * CATERING_METRICS.PER_GUEST_DAL_GRAVY_ML * multiplier) / 1000) * 10) / 10,
    dessertPieces: Math.ceil(effectiveGuests * CATERING_METRICS.PER_GUEST_SWEET_PIECES * multiplier),
    beverageLiters: Math.round(((effectiveGuests * CATERING_METRICS.PER_GUEST_BEVERAGE_ML * multiplier) / 1000) * 10) / 10,
    dietaryBreakdown: { ...dietaryCounts },
  };
}
