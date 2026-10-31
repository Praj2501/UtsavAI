import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CopilotDrawer } from '../CopilotDrawer';
import { useEventStore } from '../../../stores/eventStore';
import { Event, BudgetItem, Task, Vendor } from '../../../types/event.types';
import { globalAiRateLimiter } from '../../../ai/rateLimiter';

const mockEvent: Event = {
  id: 'test-evt-1',
  members: { 'user-1': 'owner' },
  title: "Pooja's Wedding",
  eventType: 'wedding',
  date: '2026-11-20',
  city: 'Pune',
  guestCount: 250,
  totalBudget: 1200000,
  tradition: 'Maharashtrian',
  vibe: 'Traditional',
  themes: [],
  planB: [],
  vendorChecklist: [],
};

const mockBudget: BudgetItem[] = [
  {
    id: 'b-1',
    category: 'Decor',
    name: 'Mandap Flowers',
    allocatedAmount: 180000,
    actualAmount: 100000,
    paidAmount: 50000,
    status: 'partial',
    isLocked: false,
    rationale: 'Initial floral estimate',
  },
];

const mockTasks: Task[] = [];
const mockVendors: Vendor[] = [];

describe('CopilotDrawer & Diff Accept/Undo flow', () => {
  beforeEach(() => {
    globalAiRateLimiter.reset();
    useEventStore.getState().setEventData({
      event: mockEvent,
      budgetItems: mockBudget,
      tasks: mockTasks,
      vendors: mockVendors,
    });
  });

  it('renders trigger button and opens drawer with accessible aria-live region', () => {
    render(<CopilotDrawer />);

    const trigger = screen.getByRole('button', { name: /Open Utsav AI Copilot drawer/i });
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: /Utsav AI Copilot/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('proposes diff from AI; changes are NOT applied until Accept is clicked, and Undo reverts via revertDiff', async () => {
    render(<CopilotDrawer />);

    // Open drawer
    fireEvent.click(screen.getByRole('button', { name: /Open Utsav AI Copilot drawer/i }));

    // Send budget inquiry message
    const input = screen.getByRole('textbox', { name: /Message Utsav Copilot/i });
    const sendBtn = screen.getByRole('button', { name: /Send message to Copilot/i });

    fireEvent.change(input, { target: { value: 'Can you rebalance budget for decor?' } });
    fireEvent.click(sendBtn);

    // Wait for diff proposal card to appear
    await waitFor(() => {
      expect(screen.getByText(/Pending Approval/i)).toBeInTheDocument();
    });

    // Verify nothing is written/applied before Accept
    const storeStateBefore = useEventStore.getState();
    const decorBefore = storeStateBefore.budgetItems.find((b: BudgetItem) => b.id === 'b-1');
    expect(decorBefore?.allocatedAmount).toBe(180000);

    // Click Accept button on diff card
    const acceptBtn = screen.getByRole('button', { name: /Accept proposal/i });
    fireEvent.click(acceptBtn);

    // Verify diff applied to store state
    await waitFor(() => {
      expect(screen.getByText(/✓ Applied/i)).toBeInTheDocument();
    });

    const storeStateAfterAccept = useEventStore.getState();
    const decorAfter = storeStateAfterAccept.budgetItems.find((b: BudgetItem) => b.id === 'b-1');
    expect(decorAfter?.allocatedAmount).toBe(195000);

    // Click Undo button to invoke revertDiff
    const undoBtn = screen.getByRole('button', { name: /Undo proposal/i });
    fireEvent.click(undoBtn);

    // Verify diff reverted in store state back to initial value
    await waitFor(() => {
      expect(screen.getByText(/↩ Reverted/i)).toBeInTheDocument();
    });

    const storeStateAfterUndo = useEventStore.getState();
    const decorReverted = storeStateAfterUndo.budgetItems.find((b: BudgetItem) => b.id === 'b-1');
    expect(decorReverted?.allocatedAmount).toBe(180000);
  });

  it('handles add_task proposal: nothing added before Accept, added on Accept, removed on Undo', async () => {
    render(<CopilotDrawer />);

    fireEvent.click(screen.getByRole('button', { name: /Open Utsav AI Copilot drawer/i }));

    const input = screen.getByRole('textbox', { name: /Message Utsav Copilot/i });
    const sendBtn = screen.getByRole('button', { name: /Send message to Copilot/i });

    fireEvent.change(input, { target: { value: 'Please add task for pandit' } });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText(/Pending Approval/i)).toBeInTheDocument();
    });

    // Verify task not in store yet
    expect(useEventStore.getState().tasks).toHaveLength(0);

    // Accept task
    const acceptBtn = screen.getByRole('button', { name: /Accept proposal/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(screen.getByText(/✓ Applied/i)).toBeInTheDocument();
    });
    expect(useEventStore.getState().tasks).toHaveLength(1);
    expect(useEventStore.getState().tasks[0]?.title).toContain('Pandit');

    // Undo task addition via revertDiff
    const undoBtn = screen.getByRole('button', { name: /Undo proposal/i });
    fireEvent.click(undoBtn);

    await waitFor(() => {
      expect(screen.getByText(/↩ Reverted/i)).toBeInTheDocument();
    });
    expect(useEventStore.getState().tasks).toHaveLength(0);
  });
});
