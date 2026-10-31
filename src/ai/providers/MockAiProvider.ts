import { ZodSchema } from 'zod';
import { AiProvider, AiRequestOptions } from './AiProvider.interface';
import { AppError, Result, ok } from '../../types/result.types';
import { TrimmedPlanSnapshot } from '../trimmedSnapshot';
import { CopilotTurnOutput } from '../schemas/copilot.schema';
import { globalAiCache, AiResponseCache } from '../cache';
import { globalAiRateLimiter } from '../rateLimiter';
import { BlueprintOutput } from '../schemas/blueprint.schema';
import { rebalanceBudget } from '../../domain/rebalanceBudget';
import { BudgetItem } from '../../types/event.types';

export const PUNE_HERO_BLUEPRINT: BlueprintOutput = {
  title: "Pooja & Rahul's Maharashtrian Wedding",
  budgetCategories: [
    { category: 'Venue', name: 'Banquet & Heritage Lawn', allocatedAmount: 360000, percentage: 30, rationale: 'Includes Mandap area and dining hall for 250 guests' },
    { category: 'Catering', name: 'Traditional Maharashtrian Feast', allocatedAmount: 360000, percentage: 30, rationale: 'Includes Puran Poli, Ukdiche Modak, and live counters' },
    { category: 'Decor', name: 'Marigold & Shevanti Mandap', allocatedAmount: 180000, percentage: 15, rationale: 'Eco-friendly brass elements and fresh marigold torans' },
    { category: 'Photography', name: 'Candid & Traditional Team', allocatedAmount: 120000, percentage: 10, rationale: 'Two photographers and videographer covering all ceremonies' },
    { category: 'Attire & Beauty', name: 'Paithani & Bridal Makeup', allocatedAmount: 96000, percentage: 8, rationale: 'Pure silk Paithani saree and Nauvari drape artist' },
    { category: 'Rituals & Music', name: 'Pandit, Sanai & Choughada', allocatedAmount: 48000, percentage: 4, rationale: 'Authentic Maharashtrian musical ensemble for Muhurat' },
    { category: 'Gifts & Invites', name: 'Kankotri & Return Favors', allocatedAmount: 36000, percentage: 3, rationale: 'Eco-friendly seed paper invites and brass diyas' },
  ],
  tasks: [
    { id: 't-1', title: 'Confirm Heritage Lawn Venue in Pune', category: 'Venue', leadDays: 90, priority: 'high' },
    { id: 't-2', title: 'Finalize Maharashtrian Catering Menu & Tasting', category: 'Catering', leadDays: 75, priority: 'high' },
    { id: 't-3', title: 'Select Traditional Paithani & Nauvari Sarees', category: 'Attire & Beauty', leadDays: 60, priority: 'medium' },
    { id: 't-4', title: 'Book Candid Wedding Photographer', category: 'Photography', leadDays: 60, priority: 'high' },
    { id: 't-5', title: 'Send Digital & Physical Kankotri Invitations', category: 'Gifts & Invites', leadDays: 45, priority: 'medium' },
    { id: 't-6', title: 'Schedule Sangeet & Sanai Choughada Musicians', category: 'Rituals & Music', leadDays: 30, priority: 'low' },
    { id: 't-7', title: 'Arrange Wedding Ritual Samagri & Puja Thalis', category: 'Rituals & Music', leadDays: 14, priority: 'high' },
    { id: 't-8', title: 'Final RSVP Headcount & Table Layout Review', category: 'Catering', leadDays: 7, priority: 'high' },
  ],
  vendorChecklist: [
    {
      category: 'Venue',
      items: [
        { label: 'Verify alcohol and loud music timing permissions in Pune', done: false },
        { label: 'Check bridal changing room AC and private lockers', done: false },
        { label: 'Inspect parking capacity for 80+ vehicles', done: true },
      ],
    },
    {
      category: 'Catering',
      items: [
        { label: 'Ensure dedicated separate prep area for Jain counter', done: false },
        { label: 'Confirm hot Ukdiche Modak steaming live station', done: false },
        { label: 'Verify copper serving ware for authentic look', done: true },
      ],
    },
  ],
  themes: [
    {
      name: 'Peshwai Splendor',
      palette: ['#ea580c', '#ca8a04', '#991b1b', '#fde68a', '#78350f'],
      decorDescription: 'Warm marigold torans, antique brass Samai oil lamps, velvet royal crimson drapes.',
      musicSuggestion: 'Subtle Shehnai and Sanai melodies blending into Santoor classical ragas.',
    },
    {
      name: 'Paithani Palette',
      palette: ['#047857', '#b91c1c', '#ca8a04', '#fef3c7'],
      decorDescription: 'Peacock motifs, rich emerald green backdrops, gold zari borders.',
      musicSuggestion: 'Natyasangeet and classical instrumental flute.',
    },
    {
      name: 'Sahyadri Serenity',
      palette: ['#15803d', '#f59e0b', '#fffbeb', '#451a03'],
      decorDescription: 'Rustic wooden cabanas, fresh banana leaves, terracotta pottery and mogra.',
      musicSuggestion: 'Acoustic sitar and morning ragas for open-air muhurat.',
    },
    {
      name: 'Modern Marathi Elegance',
      palette: ['#f43f5e', '#fbbf24', '#ffffff', '#fed7aa'],
      decorDescription: 'Minimalist white floral pillars accented with deep magenta genda flowers.',
      musicSuggestion: 'Fusion Marathi folk acoustic covers.',
    },
    {
      name: 'Chandan & Haldi Glow',
      palette: ['#eab308', '#ea580c', '#fef9c3', '#713f12'],
      decorDescription: 'Golden turmeric drapery with scented jasmine chandeliers and brass thalis.',
      musicSuggestion: 'Upbeat Haldi Dholki beats and traditional wedding Mangalashtak.',
    },
  ],
  planB: [
    {
      risk: 'Unseasonal evening shower on the open lawn',
      trigger: 'Pune IMD weather forecast >40% rain 48 hours prior',
      contingency: 'Pre-book the adjacent covered banquet hall as backup and arrange canopy tents over dining stations.',
    },
    {
      risk: 'Dhol-Tasha / Music volume restriction after 10:00 PM',
      trigger: 'Local Pune municipal police guidelines strictly enforced',
      contingency: 'Shift after-hours celebration indoors to the sound-insulated banquet hall for DJ and open mic.',
    },
    {
      risk: 'Primary bridal makeup artist delay due to highway traffic',
      trigger: 'Artist not checked in 3 hours before Muhurat',
      contingency: 'Retainer placed on vetted backup Pune makeup artist 10 minutes away on standby.',
    },
  ],
};

interface ParsedPromptSpecs {
  eventType: 'wedding' | 'birthday' | 'community';
  totalBudget: number;
  title: string;
  city: string;
  guestCount: number;
  tradition: string;
  vibe: string;
}

function parseBlueprintPrompt(prompt: string): ParsedPromptSpecs {
  let eventType: 'wedding' | 'birthday' | 'community' = 'wedding';
  const typeMatch = prompt.match(/- Event Type:\s*([a-zA-Z]+)/i);
  if (typeMatch && typeMatch[1]) {
    const rawType = typeMatch[1].toLowerCase();
    if (rawType.includes('birthday')) eventType = 'birthday';
    else if (rawType.includes('community')) eventType = 'community';
    else eventType = 'wedding';
  } else if (prompt.includes('birthday')) {
    eventType = 'birthday';
  } else if (prompt.includes('community')) {
    eventType = 'community';
  }

  const budgetMatch = prompt.match(/Total Budget:\s*INR\s*(\d+)/i) || prompt.match(/totalBudget\s*[:=]\s*(\d+)/i);
  const totalBudget = (budgetMatch && budgetMatch[1]) ? parseInt(budgetMatch[1], 10) : 500000;

  const cityMatch = prompt.match(/- Location:\s*([^\r\n]+)/i);
  const city = (cityMatch && cityMatch[1]) ? cityMatch[1].trim() : 'Pune';

  const guestMatch = prompt.match(/- Expected Guests:\s*(\d+)/i);
  const guestCount = (guestMatch && guestMatch[1]) ? parseInt(guestMatch[1], 10) : 100;

  const traditionMatch = prompt.match(/- Cultural Tradition:\s*([^\r\n]+)/i);
  const tradition = (traditionMatch && traditionMatch[1]) ? traditionMatch[1].trim() : 'Traditional Indian';

  const vibeMatch = prompt.match(/- Desired Vibe:\s*([^\r\n]+)/i);
  const vibe = (vibeMatch && vibeMatch[1]) ? vibeMatch[1].trim() : 'Festive and joyful';

  let title = `${tradition} Celebration in ${city}`;
  if (eventType === 'wedding') {
    title = `${tradition} Wedding Celebration in ${city}`;
  } else if (eventType === 'birthday') {
    title = `Milestone ${tradition} Birthday in ${city}`;
  } else if (eventType === 'community') {
    title = `${tradition} Community Utsav in ${city}`;
  }

  return {
    eventType,
    totalBudget,
    title,
    city,
    guestCount,
    tradition,
    vibe,
  };
}

export function buildMockBlueprint(specs: ParsedPromptSpecs): BlueprintOutput {
  const { eventType, totalBudget, title, city, guestCount, tradition, vibe } = specs;

  let baseCategories: Array<{ category: string; name: string; weight: number; rationale: string }> = [];
  let tasks: BlueprintOutput['tasks'] = [];
  let vendorChecklist: BlueprintOutput['vendorChecklist'] = [];
  let themes: BlueprintOutput['themes'] = [];
  let planB: BlueprintOutput['planB'] = [];

  if (eventType === 'birthday') {
    baseCategories = [
      { category: 'Party Hall & Play Area', name: 'Banquet & Activity Arena', weight: 30, rationale: `Indoor party hall with safe play zone in ${city} for ${guestCount} guests` },
      { category: 'Catering & Custom Cake', name: 'Themed Buffet & Artisanal Cake', weight: 35, rationale: `Kid-friendly live chaat counters, finger food, and handcrafted themed cake tailored for ${tradition}` },
      { category: 'Theme Decor & Balloons', name: 'Balloon Arches & LED Backdrop', weight: 15, rationale: `Vibrant balloon installations matching the ${vibe} vibe` },
      { category: 'Entertainment & Games', name: 'Emcee, Magician & Mascot', weight: 12, rationale: 'Interactive game host, puppet/magic show, and party mascot' },
      { category: 'Return Favors & Invites', name: 'Personalized Goodie Hampers', weight: 8, rationale: `Custom gift hampers for ${guestCount} guests and digital animated invites` },
    ];

    tasks = [
      { id: 't-b1', title: `Book Party Hall & Play Arena in ${city}`, category: 'Party Hall & Play Area', leadDays: 45, priority: 'high' },
      { id: 't-b2', title: `Order Signature Custom Birthday Cake in ${city}`, category: 'Catering & Custom Cake', leadDays: 30, priority: 'high' },
      { id: 't-b3', title: `Finalize Birthday Theme Decor & Balloon Installations`, category: 'Theme Decor & Balloons', leadDays: 20, priority: 'medium' },
      { id: 't-b4', title: `Book Emcee, Magician and Game Coordinator`, category: 'Entertainment & Games', leadDays: 14, priority: 'medium' },
      { id: 't-b5', title: `Pack Return Favor Gift Boxes and Goodies`, category: 'Return Favors & Invites', leadDays: 7, priority: 'low' },
      { id: 't-b6', title: `Confirm RSVP Count and Dietary Restrictions with Caterer`, category: 'Catering & Custom Cake', leadDays: 3, priority: 'high' },
    ];

    vendorChecklist = [
      {
        category: 'Party Hall & Play Area',
        items: [
          { label: 'Check child-safety precautions and first-aid kits on premises', done: false },
          { label: `Verify indoor sound system and microphone permissions in ${city}`, done: true },
        ],
      },
      {
        category: 'Entertainment & Games',
        items: [
          { label: 'Confirm show duration (minimum 45 minutes interactive magic/games)', done: false },
          { label: 'Verify background music playlist matches family preferences', done: true },
        ],
      },
    ];

    themes = [
      {
        name: `${tradition} Carnival Extravaganza`,
        palette: ['#f43f5e', '#3b82f6', '#eab308', '#10b981'],
        decorDescription: `Circus canopy drapes, pop-up balloon arches, and cotton candy booths embracing ${vibe}.`,
        musicSuggestion: 'Upbeat pop tunes and festive celebratory celebration beats.',
      },
      {
        name: 'Starlit Galaxy & Neon Glow',
        palette: ['#6366f1', '#a855f7', '#ec4899', '#06b6d4'],
        decorDescription: 'Dark space backdrop illuminated with glowing LED signs and celestial stars.',
        musicSuggestion: 'Modern synth-wave and energetic electronic dance music.',
      },
      {
        name: 'Royal Maharaja Heritage',
        palette: ['#b91c1c', '#ca8a04', '#78350f', '#fef3c7'],
        decorDescription: `Rich marigold garlands, brass lamps, and miniature palace arches reflecting ${tradition}.`,
        musicSuggestion: 'Traditional upbeat shehnai and celebratory dhol fusion.',
      },
      {
        name: 'Jungle Safari Adventure',
        palette: ['#15803d', '#84cc16', '#a16207', '#fef9c3'],
        decorDescription: 'Foliage creepers, animal photo cutouts, and earthy wooden crates.',
        musicSuggestion: 'Rhythmic acoustic hand-percussion and nature ambience.',
      },
      {
        name: 'Pastel Candyland Fantasy',
        palette: ['#f472b6', '#38bdf8', '#fbbf24', '#c084fc'],
        decorDescription: 'Soft pastel balloon clouds, oversized lollipop cutouts, and ice cream carts.',
        musicSuggestion: 'Acoustic feel-good pop and cheerful instrumental tracks.',
      },
    ];

    planB = [
      {
        risk: 'Birthday cake transit damage or delayed bakery arrival',
        trigger: 'Cake not delivered 2 hours prior to party start',
        contingency: 'Pre-selected reputable local backup bakery on 30-minute speed-dial for emergency sponge cake.',
      },
      {
        risk: 'Kids entertainer / Magician sudden cancellation',
        trigger: 'Lead entertainer cancels within 24 hours',
        contingency: 'Backup games emcee and prepared indoor musical chairs / trivia kit on standby with event host.',
      },
      {
        risk: 'Sudden rain affecting outdoor lawn play area',
        trigger: 'Overcast weather radar warning 6 hours prior in ' + city,
        contingency: 'Instantly migrate all games and seating into the reserved indoor banquet section.',
      },
    ];
  } else if (eventType === 'community') {
    baseCategories = [
      { category: 'Community Ground & Pandal', name: 'Pandal & Stage Infrastructure', weight: 35, rationale: `Waterproof pandal, VIP dais, and crowd security barricades in ${city} for ${guestCount} attendees` },
      { category: 'Community Mahaprasad', name: 'Community Dining & Prasadam', weight: 30, rationale: `Hygienic continuous batch catering and prasad distribution reflecting ${tradition}` },
      { category: 'Stage, AV & Sound System', name: 'Acoustic System & Stage Lighting', weight: 15, rationale: `Public address system, wireless mics, and LED screens for ${guestCount} people` },
      { category: 'Publicity & Signage', name: 'Banners, Flex & Digital Circulars', weight: 10, rationale: `Local community outreach in ${city} matching the ${vibe} theme` },
      { category: 'Sanitation & Safety', name: 'Volunteers, Security & Waste Mgmt', weight: 10, rationale: 'Fire safety compliance, medical first-aid booth, and eco-friendly waste disposal' },
    ];

    tasks = [
      { id: 't-c1', title: `Obtain Municipal & Police Sound Permits in ${city}`, category: 'Community Ground & Pandal', leadDays: 60, priority: 'high' },
      { id: 't-c2', title: `Erect Main Pandal, Stage and Security Barricades`, category: 'Community Ground & Pandal', leadDays: 30, priority: 'high' },
      { id: 't-c3', title: `Book High-Decibel Acoustic Sound and PA System`, category: 'Stage, AV & Sound System', leadDays: 21, priority: 'high' },
      { id: 't-c4', title: `Procure Bulk Grains & Groceries for Community Mahaprasad`, category: 'Community Mahaprasad', leadDays: 14, priority: 'high' },
      { id: 't-c5', title: `Deploy Volunteer Marshals and Emergency Medical Desk`, category: 'Sanitation & Safety', leadDays: 7, priority: 'medium' },
      { id: 't-c6', title: `Final Sound Check and Community Dais Rehearsal`, category: 'Stage, AV & Sound System', leadDays: 1, priority: 'high' },
    ];

    vendorChecklist = [
      {
        category: 'Community Ground & Pandal',
        items: [
          { label: `Verify structural safety certificate for stage and bamboo pandal in ${city}`, done: true },
          { label: 'Check emergency fire extinguisher placement at all exits', done: false },
        ],
      },
      {
        category: 'Sanitation & Safety',
        items: [
          { label: 'Confirm commercial water tanker supply for handwashing and drinking', done: false },
          { label: 'Designate separate dry and wet waste segregation bins', done: true },
        ],
      },
    ];

    themes = [
      {
        name: `${tradition} Lokmanya Mahotsav`,
        palette: ['#ea580c', '#ca8a04', '#991b1b', '#fef3c7'],
        decorDescription: `Grand orange saffron flags, traditional Torans, and brass Dhol stands for ${vibe}.`,
        musicSuggestion: 'Live Dhol-Tasha troop beats, devotional Bhajans, and patriotic anthems.',
      },
      {
        name: 'Vedic Shanti & Spiritual Harmony',
        palette: ['#d97706', '#451a03', '#ffffff', '#fde68a'],
        decorDescription: 'Sandalwood pillars, lotus pond floral rangoli, and serene sacred geometry backdrop.',
        musicSuggestion: 'Chanting of Vedic mantras and instrumental sitar devotionals.',
      },
      {
        name: 'Gramin Utsav & Folk Cultural Pride',
        palette: ['#047857', '#ca8a04', '#b91c1c', '#fed7aa'],
        decorDescription: 'Terracotta lamps, handcrafted Warli art panels, and bamboo archways.',
        musicSuggestion: 'Folk Lavani, Gondhal, and acoustic Lezim performance.',
      },
      {
        name: 'Swachh & Harit Eco-Sammelan',
        palette: ['#15803d', '#65a30d', '#fef9c3', '#166534'],
        decorDescription: 'Zero-plastic bamboo installations, potted tulsi planters, and khadi banners.',
        musicSuggestion: 'Acoustic flute melodies and environmental awareness songs.',
      },
      {
        name: 'Deepotsav Festival of Lights',
        palette: ['#eab308', '#ea580c', '#713f12', '#fef08a'],
        decorDescription: 'Illumination of 1000 clay diyas, brass samais, and golden fairy light canopies.',
        musicSuggestion: 'Resonant classical Hindustani morning and evening ragas.',
      },
    ];

    planB = [
      {
        risk: 'Sudden electrical grid tripping during prime public ceremony',
        trigger: 'Power blackout in local area',
        contingency: 'Dual 50kVA diesel backup generators with auto-phase changeover installed on standby.',
      },
      {
        risk: 'Surge in community crowd exceeding ground capacity',
        trigger: 'Crowd size surpasses 120% of estimated headcount',
        contingency: 'Enforce one-way barricade flow and activate auxiliary outdoor LED screening zone.',
      },
      {
        risk: 'Heavy unseasonal rain waterlogging open public ground in ' + city,
        trigger: 'Heavy rainfall alert from local IMD forecast',
        contingency: 'Install raised waterproof wooden decking across primary walking pathways and dais.',
      },
    ];
  } else {
    // Wedding default
    baseCategories = [
      { category: 'Venue', name: `Banquet & Mandap Lawn in ${city}`, weight: 30, rationale: `Includes Mandap area and dining hall for ${guestCount} guests in ${city}` },
      { category: 'Catering', name: `${tradition} Traditional Feast`, weight: 30, rationale: `Authentic multi-course menu and live counters tailored for ${tradition}` },
      { category: 'Decor', name: `Floral & Royal ${vibe} Mandap`, weight: 15, rationale: `Fresh floral torans and brass lamps matching ${vibe} aesthetic` },
      { category: 'Photography', name: 'Candid & Cinematic Media Team', weight: 10, rationale: 'Photographers and cinematographers covering pre-wedding to reception' },
      { category: 'Attire & Beauty', name: 'Traditional Bridal & Groom Ensembles', weight: 7, rationale: `Artisanal silk attire and professional makeup artists in ${city}` },
      { category: 'Rituals & Music', name: 'Ceremonial Music & Priests', weight: 5, rationale: `Vetted priests for sacred rituals and live traditional instrumentalists` },
      { category: 'Gifts & Invites', name: 'Custom Invitations & Return Favors', weight: 3, rationale: `Eco-friendly invites and curated return gifts for ${guestCount} attendees` },
    ];

    tasks = [
      { id: 't-w1', title: `Confirm Wedding Venue & Mandap in ${city}`, category: 'Venue', leadDays: 90, priority: 'high' },
      { id: 't-w2', title: `Finalize ${tradition} Catering Menu & Food Tasting`, category: 'Catering', leadDays: 75, priority: 'high' },
      { id: 't-w3', title: `Select Traditional Bridal & Groom Ensembles`, category: 'Attire & Beauty', leadDays: 60, priority: 'medium' },
      { id: 't-w4', title: `Book Candid Wedding Photography & Cinematography`, category: 'Photography', leadDays: 60, priority: 'high' },
      { id: 't-w5', title: `Send Digital & Printed Invitations to ${guestCount} Guests`, category: 'Gifts & Invites', leadDays: 45, priority: 'medium' },
      { id: 't-w6', title: `Schedule Traditional Musicians & Priest for Muhurat`, category: 'Rituals & Music', leadDays: 30, priority: 'high' },
      { id: 't-w7', title: `Review Final RSVP Count and Guest Seating Chart`, category: 'Catering', leadDays: 7, priority: 'high' },
    ];

    vendorChecklist = [
      {
        category: 'Venue',
        items: [
          { label: `Verify sound license and timing permissions in ${city}`, done: false },
          { label: 'Inspect bridal suite air-conditioning and secure lockers', done: true },
        ],
      },
      {
        category: 'Catering',
        items: [
          { label: `Ensure dedicated separate prep area for dietary preferences`, done: false },
          { label: 'Confirm live counters and traditional copper serving ware', done: true },
        ],
      },
    ];

    themes = [
      {
        name: `${tradition} Royal Heritage`,
        palette: ['#ea580c', '#ca8a04', '#991b1b', '#fde68a', '#78350f'],
        decorDescription: `Warm marigold torans, antique brass Samai oil lamps, royal drapes in ${city}.`,
        musicSuggestion: 'Subtle Shehnai and Santoor classical ragas for Muhurat.',
      },
      {
        name: 'Pastel Garden Serenade',
        palette: ['#f472b6', '#fbbf24', '#ffffff', '#fed7aa'],
        decorDescription: `Minimalist floral arches with soft white and blush pink roses reflecting ${vibe}.`,
        musicSuggestion: 'Acoustic instrumental fusion and romantic melodies.',
      },
      {
        name: 'Emerald & Gold Zari Elegance',
        palette: ['#047857', '#b91c1c', '#ca8a04', '#fef3c7'],
        decorDescription: 'Deep emerald backdrops accented with gold zari borders and temple motifs.',
        musicSuggestion: 'Classical flute and devotional wedding mangalashtak.',
      },
      {
        name: 'Turmeric & Marigold Sunrise',
        palette: ['#eab308', '#ea580c', '#fef9c3', '#713f12'],
        decorDescription: 'Golden turmeric drapes with cascading fresh jasmine strings and brass urulis.',
        musicSuggestion: 'Upbeat Haldi Dholki beats and folk wedding songs.',
      },
      {
        name: 'Rustic Earth & Terracotta Bliss',
        palette: ['#15803d', '#f59e0b', '#fffbeb', '#451a03'],
        decorDescription: 'Natural banana leaf arches, earthen pots, and mogra chandeliers.',
        musicSuggestion: 'Soothing sitar and morning ragas for open-air celebration.',
      },
    ];

    planB = [
      {
        risk: 'Unseasonal rain shower during open lawn ceremony in ' + city,
        trigger: 'Local forecast rain probability >40% 48 hours prior',
        contingency: 'Pre-book the adjacent covered banquet hall as backup and install waterproof canopy tents.',
      },
      {
        risk: 'Music sound limits enforced after 10:00 PM',
        trigger: 'Local municipal noise regulations strictly enforced',
        contingency: 'Move celebration indoors to soundproof banquet space with wireless audio.',
      },
      {
        risk: 'Lead makeup artist delay in highway traffic',
        trigger: 'Artist not arrived 3 hours before Muhurat',
        contingency: 'Backup verified local bridal stylist on active standby within 15 minutes distance.',
      },
    ];
  }

  // Generate preliminary budget items
  const dummyItems: BudgetItem[] = baseCategories.map((c, idx) => ({
    id: `b-mock-${idx + 1}`,
    category: c.category,
    name: c.name,
    allocatedAmount: Math.round((c.weight / 100) * totalBudget),
    actualAmount: 0,
    paidAmount: 0,
    status: 'pending',
    isLocked: false,
    rationale: c.rationale,
  }));

  const rebalancedRes = rebalanceBudget(dummyItems, totalBudget);
  const rebalancedItems = rebalancedRes.ok ? rebalancedRes.value : dummyItems;

  const budgetCategories = rebalancedItems.map((item, idx) => ({
    category: item.category,
    name: item.name,
    allocatedAmount: item.allocatedAmount,
    percentage: Math.round((item.allocatedAmount / (totalBudget || 1)) * 100),
    rationale: baseCategories[idx]?.rationale || 'Category allocation',
  }));

  return {
    title,
    budgetCategories,
    tasks,
    vendorChecklist,
    themes,
    planB,
  };
}

export class MockAiProvider implements AiProvider {
  public readonly isMock = true;

  public async generateStructured<T>(
    prompt: string,
    _schema: ZodSchema<T>,
    options?: AiRequestOptions
  ): Promise<Result<T, AppError>> {
    if (!options?.bypassRateLimit) {
      const rateCheck = globalAiRateLimiter.checkLimit();
      if (!rateCheck.ok) return rateCheck;
      globalAiRateLimiter.recordRequest();
    }

    const cacheKey = AiResponseCache.hashKey('mock:structured', prompt);
    if (!options?.bypassCache && globalAiCache.has(cacheKey)) {
      return ok(globalAiCache.get<T>(cacheKey)!);
    }

    // Deterministic dispatch based on prompt context
    let payload: unknown;

    if (prompt.includes('rebalancing engine') || prompt.includes('WhatIf')) {
      payload = {
        summaryRationale: 'Proportionally scaled non-venue expenditures to preserve essential catering headcount while absorbing total adjustment.',
        adjustments: [
          { id: 'b-1', category: 'Decor', suggestedAmount: 160000, delta: -20000, reason: 'Trim secondary floral arches while keeping main Mandap intact' },
          { id: 'b-2', category: 'Gifts & Invites', suggestedAmount: 30000, delta: -6000, reason: 'Transition physical invites to digital video cards' },
        ],
      };
    } else if (prompt.includes('guest management strategist') || prompt.includes('RSVP')) {
      payload = {
        seatingAdvice: 'Place elderly guests in central banquet seating with direct sightline to Mandap. Reserve table 4 & 5 for Jain dietary guests near the exclusive Jain live counter.',
        menuOptimizations: [
          'Set up dedicated Jain live counter with separate oil and ladles',
          'Ensure 30 extra portions of hot Ukdiche Modak during evening peak',
        ],
        specialConsiderations: 'Peanut allergy flagged by 2 guests: clearly label peanut oil vs ghee preparations on buffet cards.',
      };
    } else if (prompt.includes('copywriter') || prompt.includes('invitation')) {
      payload = {
        title: 'सस्नेह आमंत्रण - पूजा व राहुल विवाह सोहळा',
        body: 'श्री गजानन प्रसन्न ।\n\nसस्नेह नमस्कार, आमच्या भगिनी पूजा व राहुल यांचा शुभविवाह पुणे येथे संपन्न होत आहे. आपण सहकुटुंब उपस्थित राहून वधू-वरांस शुभाशीर्वाद द्यावेत, ही नम्र विनंती.\n\nदिनांक: २० नोव्हेंबर २०२६\nस्थळ: ग्रँड लॉन, पुणे.',
        language: 'mr',
        tone: 'traditional',
        suggestedHashtags: ['#PoojaRahulKiShaadi', '#UtsavPune2026'],
      };
    } else {
      // Blueprint generation adapted to prompt specifications
      const specs = parseBlueprintPrompt(prompt);
      payload = buildMockBlueprint(specs);
    }

    globalAiCache.set(cacheKey, payload);
    return ok(payload as T);
  }

  public async generateText(
    prompt: string,
    options?: AiRequestOptions
  ): Promise<Result<string, AppError>> {
    if (!options?.bypassRateLimit) {
      const rateCheck = globalAiRateLimiter.checkLimit();
      if (!rateCheck.ok) return rateCheck;
      globalAiRateLimiter.recordRequest();
    }

    const cacheKey = AiResponseCache.hashKey('mock:text', prompt);
    if (!options?.bypassCache && globalAiCache.has(cacheKey)) {
      return ok(globalAiCache.get<string>(cacheKey)!);
    }

    let text = 'Namaste! We are planning a Maharashtrian wedding for 250 guests in Pune on 20th November 2026. Could you please share your availability and package options within our budget? Looking forward to hearing from you.';

    if (prompt.includes('Marathi') || prompt.includes('mr')) {
      text = 'सस्नेह नमस्कार! आम्ही २० नोव्हेंबर २०२६ रोजी पुण्यात २५० पाहुण्यांच्या लग्न सोहळ्यासाठी चौकशी करत आहोत. कृपया आपल्या उपलब्ध तारखा आणि अंदाजपत्रक (Quotation) पाठवावे.';
    } else if (prompt.includes('Hindi') || prompt.includes('hi')) {
      text = 'नमस्ते! हम 20 नवंबर 2026 को पुणे में 250 मेहमानों के वैवाहिक समारोह के लिए संपर्क कर रहे हैं। कृपया अपने पैकेजेस और उपलब्धता की जानकारी साझा करें।';
    }

    globalAiCache.set(cacheKey, text);
    return ok(text);
  }

  public async runCopilotTurn(
    userMessage: string,
    planSnapshot: TrimmedPlanSnapshot,
    options?: AiRequestOptions
  ): Promise<Result<CopilotTurnOutput, AppError>> {
    if (!options?.bypassRateLimit) {
      const rateCheck = globalAiRateLimiter.checkLimit();
      if (!rateCheck.ok) return rateCheck;
      globalAiRateLimiter.recordRequest();
    }

    const lower = userMessage.toLowerCase();
    const result: CopilotTurnOutput = {
      replyText: `I have analyzed your request regarding "${planSnapshot.title}". Here is my proposed update:`,
      toolCalls: [],
    };

    if (lower.includes('budget') || lower.includes('cost') || lower.includes('decor')) {
      result.replyText = 'I propose rebalancing the Decor budget item to accommodate additional floral arches. Click Accept below to apply this change.';
      result.toolCalls.push({
        name: 'update_budget_item',
        args: {
          itemId: planSnapshot.budgetItems[0]?.id ?? 'b-1',
          allocatedAmount: 195000,
          rationale: 'Increased floral arch coverage as requested',
        },
      });
    } else if (lower.includes('task') || lower.includes('add') || lower.includes('pandit')) {
      result.replyText = 'I propose adding a high-priority task for booking the Pandit 45 days in advance.';
      result.toolCalls.push({
        name: 'add_task',
        args: {
          title: 'Book Guruji / Pandit for Wedding Muhurat',
          category: 'Rituals & Music',
          leadDays: 45,
          priority: 'high',
        },
      });
    } else if (lower.includes('vendor') || lower.includes('caterer') || lower.includes('photographer')) {
      result.replyText = 'I propose adding a shortlisted catering vendor from Pune with traditional Maharashtrian menu experience.';
      result.toolCalls.push({
        name: 'add_vendor',
        args: {
          category: 'Catering',
          name: 'Shree Ganesh Caterers Pune',
          contactName: 'Suresh Kulkarni',
          phone: '+91 98220 12345',
          email: 'ganeshcaterers@example.com',
          quotedAmount: 350000,
          notes: 'Specializes in Puran Poli and authentic Ukdiche Modak live stations',
        },
      });
    } else {
      result.replyText = `I am here to assist with your ${planSnapshot.eventType} planning in ${planSnapshot.city}. You can ask me to adjust budgets, add tasks, or recommend vendors!`;
    }

    return ok(result);
  }
}
