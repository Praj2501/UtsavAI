import { DietaryPreference } from '../../types/event.types';

export interface RsvpInsightsPromptInput {
  totalRsvps: number;
  attendingCount: number;
  dietaryCounts: Record<DietaryPreference, number>;
  specialNotes: string[];
}

export const rsvpInsightsPromptV1 = {
  version: '1.0.0',
  temperature: 0.4,
  build(input: RsvpInsightsPromptInput): string {
    return `You are Utsav AI's guest management strategist. Analyze RSVP responses and dietary distribution.

DATA:
- Confirmed Attending: ${input.attendingCount} of ${input.totalRsvps} responses
- Dietary Breakdown:
  * Pure Vegetarian: ${input.dietaryCounts.veg}
  * Jain Vegetarian (No root vegetables): ${input.dietaryCounts.jain_veg}
  * Non-Vegetarian: ${input.dietaryCounts.non_veg}
  * Vegan: ${input.dietaryCounts.vegan}
- Guest Notes: ${JSON.stringify(input.specialNotes.slice(0, 20))}

Provide actionable seating advice, live menu buffer optimizations (e.g. separate Jain counter), and any allergy flags.
Return ONLY valid JSON matching the RsvpInsightsOutput schema.`;
  },
};
