import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BlueprintPage, { BlueprintFormSchema } from '../BlueprintPage';

describe('Blueprint Form Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates schema correctly for valid inputs', () => {
    const validData = {
      title: "Sister's Wedding",
      eventType: 'wedding' as const,
      date: '2026-11-20',
      city: 'Pune',
      guestCount: 250,
      totalBudget: 1200000,
      tradition: 'Maharashtrian',
      vibe: 'Traditional Elegance',
      notes: 'Jain counter required',
    };

    const res = BlueprintFormSchema.safeParse(validData);
    expect(res.success).toBe(true);
  });

  it('fails validation when mandatory fields are missing or invalid', () => {
    const invalidData = {
      title: 'A', // too short (< 3)
      eventType: 'wedding' as const,
      date: 'invalid-date',
      city: '',
      guestCount: 0, // min 1
      totalBudget: 1000, // min 5000
    };

    const res = BlueprintFormSchema.safeParse(invalidData);
    expect(res.success).toBe(false);
    if (!res.success) {
      const fieldErrors = res.error.flatten().fieldErrors;
      expect(fieldErrors.title).toBeDefined();
      expect(fieldErrors.date).toBeDefined();
      expect(fieldErrors.city).toBeDefined();
      expect(fieldErrors.guestCount).toBeDefined();
      expect(fieldErrors.totalBudget).toBeDefined();
    }
  });

  it('displays validation errors on form submission when inputs are invalid', async () => {
    render(<BlueprintPage />);

    // Clear city input and enter too low budget
    const cityInput = screen.getByLabelText(/City/i);
    const budgetInput = screen.getByLabelText(/Budget/i);
    const titleInput = screen.getByLabelText(/Event Title/i);

    fireEvent.change(cityInput, { target: { value: '' } });
    fireEvent.change(budgetInput, { target: { value: '100' } });
    fireEvent.change(titleInput, { target: { value: 'Hi' } });

    const submitBtn = screen.getByRole('button', { name: /Generate Celebration Blueprint/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/City is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Minimum budget is ₹5,000/i)).toBeInTheDocument();
      expect(screen.getByText(/Event title must be at least 3 characters/i)).toBeInTheDocument();
    });
  });
});
