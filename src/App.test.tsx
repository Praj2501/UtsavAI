import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Root Scaffolding', () => {
  it('renders primary landmark heading and hero actions', async () => {
    render(<App />);
    const heading = await screen.findByRole('heading', { level: 1 }, { timeout: 5000 });
    expect(heading).toHaveTextContent(/Plan Unforgettable Celebrations with Precision/i);
    expect(screen.getByText(/Create New Event/i)).toBeInTheDocument();
  });

  it('displays Demo Mode pill in demo environment', () => {
    render(<App />);
    expect(screen.getByText(/Demo mode/i)).toBeInTheDocument();
  });
});
