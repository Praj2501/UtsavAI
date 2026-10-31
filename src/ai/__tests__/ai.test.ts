import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BlueprintOutputSchema } from '../schemas/blueprint.schema';
import { WhatIfOutputSchema } from '../schemas/whatIf.schema';
import { RsvpInsightsOutputSchema } from '../schemas/rsvpInsights.schema';
import { ContentOutputSchema } from '../schemas/content.schema';
import { CopilotTurnOutputSchema } from '../schemas/copilot.schema';
import { withValidationRetry } from '../withValidationRetry';
import { MockAiProvider, PUNE_HERO_BLUEPRINT } from '../providers/MockAiProvider';
import { FirebaseAiProvider } from '../providers/FirebaseAiProvider';
import { AiRateLimiter } from '../rateLimiter';
import { AiResponseCache } from '../cache';
import { buildTrimmedPlanSnapshot } from '../trimmedSnapshot';
import { blueprintPromptV1 } from '../prompts/blueprint.v1';
import { whatIfPromptV1 } from '../prompts/whatIf.v1';
import { copilotPromptV1 } from '../prompts/copilot.v1';
import { vendorPitchPromptV1 } from '../prompts/vendorPitch.v1';
import { rsvpInsightsPromptV1 } from '../prompts/rsvpInsights.v1';
import { contentPromptV1 } from '../prompts/content.v1';
import { Event } from '../../types/event.types';
import { z } from 'zod';

// Mock firebase/ai for testing FirebaseAiProvider without live network
vi.mock('firebase/ai', () => ({
  getAI: vi.fn().mockReturnValue({}),
  GoogleAIBackend: vi.fn(),
  getVertexAI: vi.fn().mockReturnValue({}),
  getGenerativeModel: vi.fn().mockReturnValue({
    generateContent: vi.fn().mockImplementation((prompt: string) => {
      let json = '';
      if (typeof prompt === 'string' && prompt.includes('Copilot')) {
        json = JSON.stringify({
          replyText: 'Copilot analyzed your plan and suggests adjustments.',
          toolCalls: [],
        });
      } else {
        json = JSON.stringify({
          title: "Pooja & Rahul's Wedding",
          budgetCategories: [
            { category: 'Venue', name: 'Lawn', allocatedAmount: 360000, percentage: 30, rationale: 'Standard' },
            { category: 'Catering', name: 'Feast', allocatedAmount: 360000, percentage: 30, rationale: 'Standard' },
            { category: 'Decor', name: 'Flowers', allocatedAmount: 180000, percentage: 15, rationale: 'Standard' },
          ],
          tasks: [
            { id: 't-1', title: 'Venue', category: 'Venue', leadDays: 90, priority: 'high' },
            { id: 't-2', title: 'Food', category: 'Food', leadDays: 60, priority: 'high' },
            { id: 't-3', title: 'Music', category: 'Music', leadDays: 30, priority: 'medium' },
            { id: 't-4', title: 'Puja', category: 'Puja', leadDays: 14, priority: 'high' },
            { id: 't-5', title: 'Invites', category: 'Invites', leadDays: 7, priority: 'low' },
          ],
          vendorChecklist: [
            { category: 'Venue', items: [{ label: 'Verify timing', done: false }] },
            { category: 'Catering', items: [{ label: 'Check menu', done: false }] },
          ],
          themes: [
            { name: 'T1', palette: ['#111111', '#222222', '#333333'], decorDescription: 'Decor desc 12345', musicSuggestion: 'Music 12345' },
            { name: 'T2', palette: ['#111111', '#222222', '#333333'], decorDescription: 'Decor desc 12345', musicSuggestion: 'Music 12345' },
            { name: 'T3', palette: ['#111111', '#222222', '#333333'], decorDescription: 'Decor desc 12345', musicSuggestion: 'Music 12345' },
            { name: 'T4', palette: ['#111111', '#222222', '#333333'], decorDescription: 'Decor desc 12345', musicSuggestion: 'Music 12345' },
            { name: 'T5', palette: ['#111111', '#222222', '#333333'], decorDescription: 'Decor desc 12345', musicSuggestion: 'Music 12345' },
          ],
          planB: [
            { risk: 'Rain on lawn', trigger: 'Rain forecast >50%', contingency: 'Shift indoors' },
            { risk: 'Sound cut', trigger: 'Generator failure', contingency: 'Backup DG set' },
            { risk: 'Vendor delay', trigger: 'Late by 2 hours', contingency: 'Backup vendor' },
          ],
        });
      }
      return Promise.resolve({
        response: { text: () => json },
      });
    }),
  }),
}));

describe('AI Subsystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Zod Schemas', () => {
    it('validates hero Pune wedding blueprint successfully', () => {
      const parsed = BlueprintOutputSchema.safeParse(PUNE_HERO_BLUEPRINT);
      expect(parsed.success).toBe(true);
    });

    it('rejects blueprints missing required themes or tasks', () => {
      const invalid = {
        title: 'Incomplete Plan',
        budgetCategories: [],
        tasks: [],
        vendorChecklist: [],
        themes: [],
        planB: [],
      };
      const parsed = BlueprintOutputSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('validates WhatIf, RSVP Insights, and Content schemas', () => {
      const whatIfSample = {
        summaryRationale: 'Scaled catering headcount to meet target.',
        adjustments: [{ id: '1', category: 'Decor', suggestedAmount: 10000, delta: -2000, reason: 'Trim florals' }],
      };
      expect(WhatIfOutputSchema.safeParse(whatIfSample).success).toBe(true);

      const rsvpSample = {
        seatingAdvice: 'Keep elders near Mandap entrance.',
        menuOptimizations: ['Extra modak counter'],
        specialConsiderations: 'No onion or garlic for table 2',
      };
      expect(RsvpInsightsOutputSchema.safeParse(rsvpSample).success).toBe(true);

      const contentSample = {
        title: 'Wedding Invite',
        body: 'Warmest greetings to all our family members and friends.',
        language: 'en',
        tone: 'heartfelt',
        suggestedHashtags: ['#PoojaRahul'],
      };
      expect(ContentOutputSchema.safeParse(contentSample).success).toBe(true);
    });

    it('validates Copilot tool calls', () => {
      const validTurn = {
        replyText: 'Updating your budget item now.',
        toolCalls: [
          {
            name: 'update_budget_item',
            args: { itemId: 'item-1', allocatedAmount: 50000 },
          },
        ],
      };
      const parsed = CopilotTurnOutputSchema.safeParse(validTurn);
      expect(parsed.success).toBe(true);
    });
  });

  describe('withValidationRetry', () => {
    const SimpleSchema = z.object({
      greeting: z.string(),
      count: z.number().int(),
    });

    it('successfully parses valid JSON on first attempt', async () => {
      const generator = vi.fn().mockResolvedValue('{"greeting": "Namaste", "count": 250}');
      const res = await withValidationRetry(SimpleSchema, generator);

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.greeting).toBe('Namaste');
        expect(res.value.count).toBe(250);
      }
      expect(generator).toHaveBeenCalledTimes(1);
    });

    it('strips markdown code fences cleanly', async () => {
      const generator = vi.fn().mockResolvedValue('```json\n{"greeting": "Namaste", "count": 250}\n```');
      const res = await withValidationRetry(SimpleSchema, generator);

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.greeting).toBe('Namaste');
      }
    });

    it('recovers on second attempt when first attempt produces malformed JSON', async () => {
      const generator = vi
        .fn()
        .mockResolvedValueOnce('Invalid non-json text')
        .mockResolvedValueOnce('{"greeting": "Recovered", "count": 100}');

      const res = await withValidationRetry(SimpleSchema, generator);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.greeting).toBe('Recovered');
      }
      expect(generator).toHaveBeenCalledTimes(2);
    });

    it('returns error when retry also fails validation', async () => {
      const generator = vi
        .fn()
        .mockResolvedValueOnce('bad 1')
        .mockResolvedValueOnce('bad 2');

      const res = await withValidationRetry(SimpleSchema, generator);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('ai/malformed-json');
      }
      expect(generator).toHaveBeenCalledTimes(2);
    });

    it('handles thrown exceptions in fetchRawResponse gracefully', async () => {
      const generator = vi.fn().mockRejectedValue(new Error('Network disconnected'));
      const res = await withValidationRetry(SimpleSchema, generator);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('ai/network-error');
        expect(res.error.message).toContain('Network disconnected');
      }
    });
  });

  describe('MockAiProvider', () => {
    it('returns valid Pune wedding hero blueprint and supports all query branches', async () => {
      const provider = new MockAiProvider();
      expect(provider.isMock).toBe(true);

      const res = await provider.generateStructured('Plan a wedding in Pune', BlueprintOutputSchema, {
        bypassCache: true,
        bypassRateLimit: true,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.title).toContain('Wedding Celebration in Pune');
        expect(res.value.themes.length).toBe(5);
        expect(res.value.budgetCategories.length).toBeGreaterThanOrEqual(3);
      }

      // WhatIf branch
      const whatIfRes = await provider.generateStructured('rebalancing engine WhatIf', z.any(), {
        bypassCache: true,
        bypassRateLimit: true,
      });
      expect(whatIfRes.ok).toBe(true);

      // RSVP branch
      const rsvpRes = await provider.generateStructured('guest management strategist RSVP', z.any(), {
        bypassCache: true,
        bypassRateLimit: true,
      });
      expect(rsvpRes.ok).toBe(true);

      // Content branch
      const contentRes = await provider.generateStructured('copywriter invitation', z.any(), {
        bypassCache: true,
        bypassRateLimit: true,
      });
      expect(contentRes.ok).toBe(true);
    });

    it('generates eventType-specific blueprints for wedding, birthday, and community with exact budget sum equality', async () => {
      const provider = new MockAiProvider();

      const weddingPrompt = blueprintPromptV1.build({
        eventType: 'wedding',
        date: '2026-11-20',
        city: 'Pune',
        guestCount: 200,
        totalBudget: 800000,
        tradition: 'Maharashtrian',
        vibe: 'Royal',
      });
      const birthdayPrompt = blueprintPromptV1.build({
        eventType: 'birthday',
        date: '2026-12-15',
        city: 'Mumbai',
        guestCount: 80,
        totalBudget: 250000,
        tradition: 'Gujarati',
        vibe: 'Carnival',
      });
      const communityPrompt = blueprintPromptV1.build({
        eventType: 'community',
        date: '2026-10-02',
        city: 'Nagpur',
        guestCount: 500,
        totalBudget: 450000,
        tradition: 'Marathi',
        vibe: 'Spiritual',
      });

      const weddingRes = await provider.generateStructured(weddingPrompt, BlueprintOutputSchema, {
        bypassCache: true,
        bypassRateLimit: true,
      });
      const birthdayRes = await provider.generateStructured(birthdayPrompt, BlueprintOutputSchema, {
        bypassCache: true,
        bypassRateLimit: true,
      });
      const communityRes = await provider.generateStructured(communityPrompt, BlueprintOutputSchema, {
        bypassCache: true,
        bypassRateLimit: true,
      });

      expect(weddingRes.ok).toBe(true);
      expect(birthdayRes.ok).toBe(true);
      expect(communityRes.ok).toBe(true);

      if (weddingRes.ok && birthdayRes.ok && communityRes.ok) {
        const weddingCats = weddingRes.value.budgetCategories.map((c) => c.category);
        const birthdayCats = birthdayRes.value.budgetCategories.map((c) => c.category);
        const communityCats = communityRes.value.budgetCategories.map((c) => c.category);

        // Birthday and community return different categories than wedding
        expect(birthdayCats).not.toEqual(weddingCats);
        expect(communityCats).not.toEqual(weddingCats);
        expect(birthdayCats).toContain('Party Hall & Play Area');
        expect(communityCats).toContain('Community Mahaprasad');
        expect(weddingCats).toContain('Venue');

        // Sum of budget categories equals entered budget exactly down to the rupee
        const weddingSum = weddingRes.value.budgetCategories.reduce((acc, c) => acc + c.allocatedAmount, 0);
        const birthdaySum = birthdayRes.value.budgetCategories.reduce((acc, c) => acc + c.allocatedAmount, 0);
        const communitySum = communityRes.value.budgetCategories.reduce((acc, c) => acc + c.allocatedAmount, 0);

        expect(weddingSum).toBe(800000);
        expect(birthdaySum).toBe(250000);
        expect(communitySum).toBe(450000);

        // Uses entered metadata
        expect(birthdayRes.value.title).toContain('Mumbai');
        expect(birthdayRes.value.title).toContain('Gujarati');
        expect(communityRes.value.title).toContain('Nagpur');
      }
    });

    it('generates localized negotiation messages in Marathi, Hindi, and English', async () => {
      const provider = new MockAiProvider();

      const resMr = await provider.generateText('Inquire in Marathi (mr)', {
        bypassCache: true,
        bypassRateLimit: true,
      });
      expect(resMr.ok).toBe(true);
      if (resMr.ok) expect(resMr.value).toContain('सस्नेह नमस्कार');

      // Test cache hit in MockAiProvider
      const cachedMr = await provider.generateText('Inquire in Marathi (mr)', {
        bypassRateLimit: true,
      });
      expect(cachedMr.ok).toBe(true);

      const resHi = await provider.generateText('Inquire in Hindi (hi)', {
        bypassCache: true,
        bypassRateLimit: true,
      });
      expect(resHi.ok).toBe(true);
      if (resHi.ok) expect(resHi.value).toContain('नमस्ते');

      const resEn = await provider.generateText('Inquire in English', {
        bypassCache: true,
        bypassRateLimit: true,
      });
      expect(resEn.ok).toBe(true);
      if (resEn.ok) expect(resEn.value).toContain('Namaste');
    });

    it('runs scripted Copilot turn with tool calls for budget, tasks, and vendors', async () => {
      const provider = new MockAiProvider();
      const snapshot = buildTrimmedPlanSnapshot(
        {
          id: '1',
          title: 'Wedding',
          eventType: 'wedding',
          date: '2026-11-20',
          city: 'Pune',
          guestCount: 250,
          totalBudget: 1200000,
          tradition: '',
          vibe: '',
          themes: [],
          planB: [],
          vendorChecklist: [],
          members: {},
        },
        [{ id: 'b-1', category: 'Decor', name: 'Flowers', allocatedAmount: 180000, actualAmount: 0, paidAmount: 0, status: 'pending', isLocked: false, rationale: '' }],
        [],
        []
      );

      // Budget query
      const turnBudget = await provider.runCopilotTurn('Can we increase the decor budget?', snapshot, {
        bypassCache: true,
        bypassRateLimit: true,
      });
      expect(turnBudget.ok).toBe(true);
      if (turnBudget.ok) {
        expect(turnBudget.value.toolCalls[0]?.name).toBe('update_budget_item');
      }

      // Task query
      const turnTask = await provider.runCopilotTurn('Add task for pandit', snapshot, {
        bypassCache: true,
        bypassRateLimit: true,
      });
      expect(turnTask.ok).toBe(true);
      if (turnTask.ok) {
        expect(turnTask.value.toolCalls[0]?.name).toBe('add_task');
      }

      // Vendor query
      const turnVendor = await provider.runCopilotTurn('Recommend a caterer vendor', snapshot, {
        bypassCache: true,
        bypassRateLimit: true,
      });
      expect(turnVendor.ok).toBe(true);
      if (turnVendor.ok) {
        expect(turnVendor.value.toolCalls[0]?.name).toBe('add_vendor');
      }

      // General query
      const turnGeneral = await provider.runCopilotTurn('Hello how are you?', snapshot, {
        bypassCache: true,
        bypassRateLimit: true,
      });
      expect(turnGeneral.ok).toBe(true);
      if (turnGeneral.ok) {
        expect(turnGeneral.value.toolCalls.length).toBe(0);
      }
    });
  });

  describe('FirebaseAiProvider', () => {
    it('executes generateStructured and generateText via vertex AI client', async () => {
      const provider = new FirebaseAiProvider();
      expect(provider.isMock).toBe(false);

      const res = await provider.generateStructured('Test prompt', BlueprintOutputSchema, {
        bypassCache: true,
        bypassRateLimit: true,
      });
      expect(res.ok).toBe(true);

      const textRes = await provider.generateText('Test text', {
        bypassCache: true,
        bypassRateLimit: true,
      });
      expect(textRes.ok).toBe(true);

      // Cache hit test
      const cachedTextRes = await provider.generateText('Test text', {
        bypassRateLimit: true,
      });
      expect(cachedTextRes.ok).toBe(true);

      // Aborted signal test
      const controller = new AbortController();
      controller.abort();
      const abortRes = await provider.generateText('Aborted prompt', {
        signal: controller.signal,
        bypassCache: true,
        bypassRateLimit: true,
      });
      expect(abortRes.ok).toBe(false);
      if (!abortRes.ok) {
        expect(abortRes.error.code).toBe('ai/aborted');
      }

      const copilotRes = await provider.runCopilotTurn(
        'Adjust decor budget',
        {
          eventId: '1',
          title: 'Wedding',
          eventType: 'wedding',
          date: '2026-11-20',
          city: 'Pune',
          guestCount: 250,
          totalBudget: 1200000,
          budgetItems: [],
          tasks: [],
          vendors: [],
        },
        { bypassCache: true, bypassRateLimit: true }
      );
      expect(copilotRes.ok).toBe(true);
    });
  });

  describe('Prompts', () => {
    it('builds prompts with versioning and security directives', () => {
      expect(blueprintPromptV1.version).toBe('1.0.0');
      const bp = blueprintPromptV1.build({
        eventType: 'wedding',
        date: '2026-11-20',
        city: 'Pune',
        guestCount: 250,
        totalBudget: 1200000,
        tradition: 'Maharashtrian',
        vibe: 'Traditional',
      });
      expect(bp).toContain('CRITICAL SECURITY DIRECTIVE');
      expect(bp).toContain('leadDays');

      const whatIf = whatIfPromptV1.build({
        currentTotal: 1000000,
        newTotal: 1200000,
        guestCount: 200,
        currentItems: [],
      });
      expect(whatIf).toContain('financial rebalancing engine');

      const copilot = copilotPromptV1.build({
        userMessage: 'Increase photography',
        planSnapshot: {
          eventId: '1',
          title: 'Wedding',
          eventType: 'wedding',
          date: '2026-11-20',
          city: 'Pune',
          guestCount: 250,
          totalBudget: 1200000,
          budgetItems: [],
          tasks: [],
          vendors: [],
        },
      });
      expect(copilot).toContain('Utsav AI Copilot');

      const pitch = vendorPitchPromptV1.build({
        vendorName: 'Pune Decor',
        category: 'Decor',
        eventDate: '2026-11-20',
        city: 'Pune',
        guestCount: 250,
        budgetCap: 150000,
        language: 'mr',
        tone: 'polite',
      });
      expect(pitch).toContain('सस्नेह नमस्कार');

      const rsvp = rsvpInsightsPromptV1.build({
        totalRsvps: 200,
        attendingCount: 180,
        dietaryCounts: { veg: 150, jain_veg: 20, non_veg: 10, vegan: 0 },
        specialNotes: ['Peanut allergy'],
      });
      expect(rsvp).toContain('Pure Vegetarian: 150');

      const content = contentPromptV1.build({
        contentType: 'invitation',
        eventType: 'wedding',
        honorees: 'Pooja & Rahul',
        date: '2026-11-20',
        venue: 'Lawn',
        city: 'Pune',
        language: 'hi',
        tone: 'traditional',
      });
      expect(content).toContain('Hindi');
    });
  });

  describe('Rate Limiter & Cache', () => {
    it('enforces debounce and session caps', () => {
      const limiter = new AiRateLimiter(500, 2);

      expect(limiter.checkLimit(1000).ok).toBe(true);
      limiter.recordRequest(1000);

      // Too soon (debounce error)
      const debounced = limiter.checkLimit(1200);
      expect(debounced.ok).toBe(false);
      if (!debounced.ok) {
        expect(debounced.error.code).toBe('ai/rate-limited');
      }

      // After debounce
      expect(limiter.checkLimit(1600).ok).toBe(true);
      limiter.recordRequest(1600);

      // Session cap reached
      const capped = limiter.checkLimit(2500);
      expect(capped.ok).toBe(false);
      if (!capped.ok) {
        expect(capped.error.code).toBe('ai/quota-exceeded');
      }

      expect(limiter.getSessionCount()).toBe(2);
      limiter.reset();
      expect(limiter.getSessionCount()).toBe(0);
    });

    it('AiResponseCache stores, retrieves, and clears data correctly', () => {
      const cache = new AiResponseCache();
      const key = AiResponseCache.hashKey('test', { query: 'pune' });

      expect(cache.get(key)).toBeNull();
      cache.set(key, { answer: 42 });
      expect(cache.has(key)).toBe(true);
      expect(cache.get<{ answer: number }>(key)?.answer).toBe(42);

      cache.clear();
      expect(cache.has(key)).toBe(false);
    });
  });

  describe('buildTrimmedPlanSnapshot', () => {
    it('creates minimal object with essential fields', () => {
      const event: Event = {
        id: 'evt-1',
        title: 'Wedding',
        eventType: 'wedding',
        date: '2026-11-20',
        city: 'Pune',
        guestCount: 250,
        totalBudget: 1200000,
        tradition: 'Maharashtrian',
        vibe: 'Royal',
        themes: [],
        planB: [],
        vendorChecklist: [],
        members: { alice: 'owner' },
      };

      const snapshot = buildTrimmedPlanSnapshot(
        event,
        [{ id: 'b-1', category: 'Decor', name: 'Flowers', allocatedAmount: 180000, actualAmount: 0, paidAmount: 0, status: 'pending', isLocked: false, rationale: '' }],
        [{ id: 't-1', title: 'Task', category: 'Catering', targetDate: '2026-11-01', leadDays: 19, status: 'todo', priority: 'high', panicStatus: 'normal' }],
        [{ id: 'v-1', category: 'Venue', name: 'Lawn', contactName: 'Ramesh', phone: '123', email: 'a@b.com', quotedAmount: 300000, status: 'booked', notes: '' }]
      );
      expect(snapshot.eventId).toBe('evt-1');
      expect(snapshot.city).toBe('Pune');
      expect(snapshot.totalBudget).toBe(1200000);
      expect(snapshot.budgetItems.length).toBe(1);
      expect(snapshot.tasks.length).toBe(1);
      expect(snapshot.vendors.length).toBe(1);
    });
  });
});
