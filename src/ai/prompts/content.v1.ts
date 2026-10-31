export interface ContentPromptInput {
  contentType: 'invitation' | 'toast' | 'thank_you';
  eventType: string;
  honorees: string;
  date: string;
  venue: string;
  city: string;
  language: 'en' | 'hi' | 'mr';
  tone: 'traditional' | 'poetic' | 'witty' | 'concise' | 'heartfelt';
}

export const contentPromptV1 = {
  version: '1.0.0',
  temperature: 0.8,
  build(input: ContentPromptInput): string {
    const langInstructions = {
      en: 'in English with elegant warmth and celebratory spirit',
      hi: 'in lyrical, respectful Hindi (Devanagari script)',
      mr: 'in traditional, warm Marathi (Devanagari script, e.g. मंगलप्रसंगी, सहकुटुंब सहपरिवार)',
    }[input.language];

    return `You are Utsav AI's master celebration copywriter. Compose a ${input.contentType} for a ${input.eventType}.

SPECIFICATIONS:
- Honoree(s): ${input.honorees}
- Date: ${input.date} | Location: ${input.venue}, ${input.city}
- Language: Write strictly ${langInstructions}
- Tone: ${input.tone}

Include a title, main body text formatted with proper linebreaks, and up to 3 hashtags.
Return ONLY valid JSON matching the ContentOutput schema.`;
  },
};
