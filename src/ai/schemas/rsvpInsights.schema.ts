import { z } from 'zod';

export const RsvpInsightsOutputSchema = z.object({
  seatingAdvice: z.string().min(10).max(400),
  menuOptimizations: z.array(z.string().min(5).max(200)).min(1).max(5),
  specialConsiderations: z.string().min(5).max(300),
});

export type RsvpInsightsOutput = z.infer<typeof RsvpInsightsOutputSchema>;
