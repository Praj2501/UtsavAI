import { z } from 'zod';

export const WhatIfCategoryAdjustmentSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(2),
  suggestedAmount: z.number().int().nonnegative(),
  delta: z.number().int(),
  reason: z.string().min(5).max(300),
});

export const WhatIfOutputSchema = z.object({
  summaryRationale: z.string().min(10).max(500),
  adjustments: z.array(WhatIfCategoryAdjustmentSchema).min(1),
});

export type WhatIfOutput = z.infer<typeof WhatIfOutputSchema>;
