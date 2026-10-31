import { z } from 'zod';

export const ContentOutputSchema = z.object({
  title: z.string().min(2).max(100),
  body: z.string().min(20).max(2000),
  language: z.enum(['en', 'hi', 'mr']),
  tone: z.enum(['traditional', 'poetic', 'witty', 'concise', 'heartfelt']),
  suggestedHashtags: z.array(z.string()).max(5),
});

export type ContentOutput = z.infer<typeof ContentOutputSchema>;
