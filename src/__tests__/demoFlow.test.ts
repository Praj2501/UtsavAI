import { describe, it, expect, beforeEach } from 'vitest';
import { useEventStore } from '../stores/eventStore';
import { getEventRepository } from '../repositories';

describe('Demo Flow End-to-End', () => {
  beforeEach(() => {
    useEventStore.setState({
      currentEvent: null,
      budgetItems: [],
      tasks: [],
      vendors: [],
      rsvps: [],
      activeView: 'landing',
    });
  });

  it('loads hero demo scenario without credentials, populating state and in-memory repository', async () => {
    const store = useEventStore.getState();
    expect(store.currentEvent).toBeNull();
    expect(store.activeView).toBe('landing');

    await store.loadDemoScenario();

    const updated = useEventStore.getState();
    expect(updated.currentEvent).not.toBeNull();
    expect(updated.currentEvent?.city).toBe('Pune');
    expect(updated.currentEvent?.totalBudget).toBe(1200000);
    expect(updated.currentEvent?.guestCount).toBe(250);
    expect(updated.activeView).toBe('dashboard');

    expect(updated.budgetItems.length).toBeGreaterThan(0);
    expect(updated.tasks.length).toBeGreaterThan(0);
    expect(updated.vendors.length).toBeGreaterThan(0);
    expect(updated.rsvps.length).toBeGreaterThan(0);

    // Verify repository sync
    const repo = getEventRepository();
    const eventRes = await repo.getEvent(updated.currentEvent!.id);
    expect(eventRes.ok).toBe(true);
    if (eventRes.ok) {
      expect(eventRes.value?.title).toBe(updated.currentEvent!.title);
    }
  });
});
