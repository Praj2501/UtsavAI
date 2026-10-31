import { describe, it, expect } from 'vitest';
import { cateringQuantities } from '../cateringQuantities';

describe('cateringQuantities', () => {
  it('calculates quantities with 7% safety buffer for wedding guest count', () => {
    const estimates = cateringQuantities(
      250,
      { veg: 200, jain_veg: 30, non_veg: 20, vegan: 0 },
      'wedding'
    );

    expect(estimates.effectiveGuests).toBe(250);
    expect(estimates.bufferPercent).toBe(7);
    // 250 * 4 pieces * 1.07 = 1070 pieces
    expect(estimates.appetizerPieces).toBe(1070);
    // 250 * 3 breads * 1.07 = 803 pieces
    expect(estimates.breadPieces).toBe(803);
    expect(estimates.mainCourseRiceKg).toBeGreaterThan(0);
    expect(estimates.dalCurryLiters).toBeGreaterThan(0);
  });

  it('handles 0 guests safely with all 0 quantities', () => {
    const estimates = cateringQuantities(0, { veg: 0, jain_veg: 0, non_veg: 0, vegan: 0 }, 'birthday');
    expect(estimates.effectiveGuests).toBe(0);
    expect(estimates.appetizerPieces).toBe(0);
    expect(estimates.mainCourseRiceKg).toBe(0);
    expect(estimates.breadPieces).toBe(0);
  });

  it('prefers rsvpAttendingCount when provided', () => {
    const estimates = cateringQuantities(
      250,
      { veg: 180, jain_veg: 20, non_veg: 0, vegan: 0 },
      'wedding',
      200 // Only 200 confirmed attending
    );
    expect(estimates.effectiveGuests).toBe(200);
    // 200 * 4 pieces * 1.07 = 856 pieces
    expect(estimates.appetizerPieces).toBe(856);
  });
});
