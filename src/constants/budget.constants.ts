/**
 * Standard budget allocation rules and catering constants for Indian celebrations.
 */

export const STANDARD_BUDGET_PERCENTAGES: Record<string, number> = {
  Venue: 25,
  Catering: 30,
  Decor: 15,
  Photography: 12,
  AttireAndBeauty: 8,
  Entertainment: 6,
  InvitationsAndGifts: 4,
};

/**
 * Catering consumption per guest in grams/units, calibrated for Indian celebratory feasts.
 * A 7% contingency buffer is added deterministically.
 */
export const CATERING_METRICS = {
  CONTINGENCY_BUFFER_PERCENT: 7,
  PER_GUEST_APPETIZERS_PIECES: 4,
  PER_GUEST_MAIN_GRAIN_GRAMS: 180, // Rice / Pulao / Biryani
  PER_GUEST_BREAD_PIECES: 3,       // Roti / Naan / Puri
  PER_GUEST_DAL_GRAVY_ML: 200,     // Dal / Curry
  PER_GUEST_SWEET_PIECES: 2,       // Gulab Jamun / Jalebi / Modak
  PER_GUEST_BEVERAGE_ML: 300,      // Welcome drinks, mocktails
} as const;
