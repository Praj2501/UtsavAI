import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { WhatIfSimulator } from '../WhatIfSimulator';
import { BudgetItem } from '../../../types/event.types';

const mockItems: BudgetItem[] = [
  {
    id: 'b-1',
    category: 'venue',
    name: 'Heritage Palace Lawn',
    allocatedAmount: 300000,
    actualAmount: 280000,
    paidAmount: 100000,
    isLocked: false,
    status: 'partial',
    rationale: 'Core venue requirement',
  },
  {
    id: 'b-2',
    category: 'catering',
    name: 'Maharashtrian Buffet',
    allocatedAmount: 400000,
    actualAmount: 400000,
    paidAmount: 200000,
    isLocked: false,
    status: 'partial',
    rationale: 'Full feast including sweets',
  },
  {
    id: 'b-3',
    category: 'decor',
    name: 'Marigold & Traditional Lights',
    allocatedAmount: 100000,
    actualAmount: 90000,
    paidAmount: 50000,
    isLocked: false,
    status: 'partial',
    rationale: 'Floral entrance & stage',
  },
];

describe('WhatIfSimulator Component', () => {
  it('renders initial slider values and current totals', () => {
    render(
      <WhatIfSimulator
        items={mockItems}
        currentTotal={800000}
        guestCount={250}
        onApply={vi.fn()}
      />
    );

    expect(screen.getByText('What-If Budget Simulator')).toBeInTheDocument();
    expect(screen.getByText('₹8,00,000')).toBeInTheDocument();
    expect(screen.getByText('250 guests')).toBeInTheDocument();
  });

  it('adjusts slider and rebalances deterministically', async () => {
    const handleApply = vi.fn();
    render(
      <WhatIfSimulator
        items={mockItems}
        currentTotal={800000}
        guestCount={250}
        onApply={handleApply}
      />
    );

    const budgetSlider = screen.getByLabelText(/Target Total Budget/i);
    act(() => {
      fireEvent.change(budgetSlider, { target: { value: '1000000' } });
    });

    expect(screen.getByText(/Previewing rebalance for/i)).toBeInTheDocument();
    expect(screen.getAllByText('₹10,00,000')).toHaveLength(2);
    expect(screen.getByText('(Exact match)')).toBeInTheDocument();

    const applyBtn = screen.getByRole('button', { name: /Apply Rebalanced Budget/i });
    await act(async () => {
      fireEvent.click(applyBtn);
    });

    expect(handleApply).toHaveBeenCalledTimes(1);
    const calls = handleApply.mock.calls as [BudgetItem[]][];
    const appliedItems = calls[0]?.[0];
    expect(appliedItems).toBeDefined();
    expect(appliedItems).toHaveLength(3);
    const sum = appliedItems!.reduce((acc, it) => acc + it.allocatedAmount, 0);
    expect(sum).toBe(1000000);
  });

  it('triggers AI suggestion and displays rationale', async () => {
    render(
      <WhatIfSimulator
        items={mockItems}
        currentTotal={800000}
        guestCount={250}
        onApply={vi.fn()}
      />
    );

    const aiButton = screen.getByRole('button', { name: /AI Suggest Rebalance/i });
    fireEvent.click(aiButton);

    await waitFor(() => {
      expect(screen.getByText(/AI Strategic Tradeoff Analysis:/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Proportionally scaled non-venue expenditures/i)
    ).toBeInTheDocument();
  });
});
