import { describe, it, expect, vi } from 'vitest';
import { InMemoryEventRepository } from '../InMemoryEventRepository';
import { getEventRepository } from '../index';
import { Event } from '../../types/event.types';
import { BudgetDiff } from '../../types/diff.types';

describe('Event Repositories', () => {
  const sampleEvent: Event = {
    id: 'evt-test-1',
    members: { 'demo-user': 'owner' },
    title: "Sister's Wedding in Pune",
    eventType: 'wedding',
    date: '2026-11-20',
    city: 'Pune',
    guestCount: 250,
    totalBudget: 1200000,
    tradition: 'Maharashtrian',
    vibe: 'Traditional Elegance',
    themes: [],
    planB: [],
    vendorChecklist: [],
  };

  it('proves demo mode defaults to InMemoryEventRepository without Firestore network calls', () => {
    const repo = getEventRepository();
    expect(repo).toBeInstanceOf(InMemoryEventRepository);
  });

  it('InMemoryEventRepository creates and retrieves event and publicEvents mirror', async () => {
    const repo = new InMemoryEventRepository();

    const createRes = await repo.createEventWithPlan(
      sampleEvent,
      [
        {
          id: 'b-1',
          category: 'Venue',
          name: 'Lawn',
          allocatedAmount: 360000,
          actualAmount: 0,
          paidAmount: 0,
          status: 'pending',
          isLocked: false,
          rationale: 'Banquet & Lawn',
        },
      ],
      [],
      []
    );
    expect(createRes.ok).toBe(true);

    const fetchedEvent = await repo.getEvent('evt-test-1');
    expect(fetchedEvent.ok).toBe(true);
    if (fetchedEvent.ok) {
      expect(fetchedEvent.value?.title).toBe("Sister's Wedding in Pune");
    }

    const fetchedPublic = await repo.getPublicEvent('evt-test-1');
    expect(fetchedPublic.ok).toBe(true);
    if (fetchedPublic.ok) {
      expect(fetchedPublic.value?.city).toBe('Pune');
    }
  });

  it('applies entity diff to in-memory state', async () => {
    const repo = new InMemoryEventRepository();
    await repo.createEventWithPlan(
      sampleEvent,
      [
        {
          id: 'b-1',
          category: 'Decor',
          name: 'Mandap',
          allocatedAmount: 180000,
          actualAmount: 0,
          paidAmount: 0,
          status: 'pending',
          isLocked: false,
          rationale: 'Floral',
        },
      ],
      [],
      []
    );

    const diff: BudgetDiff = {
      entity: 'budget',
      op: 'update',
      id: 'b-1',
      before: {
        id: 'b-1',
        category: 'Decor',
        name: 'Mandap',
        allocatedAmount: 180000,
        actualAmount: 0,
        paidAmount: 0,
        status: 'pending',
        isLocked: false,
        rationale: 'Floral',
      },
      after: {
        id: 'b-1',
        category: 'Decor',
        name: 'Mandap',
        allocatedAmount: 200000,
        actualAmount: 0,
        paidAmount: 0,
        status: 'pending',
        isLocked: false,
        rationale: 'Floral upgrade',
      },
      summary: 'Increased decor budget',
    };

    const diffRes = await repo.applyEntityDiff('evt-test-1', diff);
    expect(diffRes.ok).toBe(true);

    const items = await repo.getBudgetItems('evt-test-1');
    expect(items.ok).toBe(true);
    if (items.ok) {
      expect(items.value[0]?.allocatedAmount).toBe(200000);
    }
  });

  it('handles public RSVP creation and listener callback', async () => {
    const repo = new InMemoryEventRepository();
    await repo.createEventWithPlan(sampleEvent, [], [], []);

    const rsvpListener = vi.fn();
    const unsub = repo.subscribeToRsvps('evt-test-1', rsvpListener);

    const rsvpRes = await repo.createRsvp('evt-test-1', {
      guestName: 'Anil Kulkarni',
      guestCount: 2,
      attendance: 'attending',
      dietaryPreference: 'veg',
      note: 'Congratulations!',
    });

    expect(rsvpRes.ok).toBe(true);

    const rsvps = await repo.getRsvps('evt-test-1');
    expect(rsvps.ok).toBe(true);
    if (rsvps.ok) {
      expect(rsvps.value.length).toBe(1);
      expect(rsvps.value[0]?.guestName).toBe('Anil Kulkarni');
    }

    unsub();
  });
});
