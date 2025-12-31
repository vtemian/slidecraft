import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the title', () => {
    render(<App />);
    expect(screen.getByText('SlideCraft')).toBeInTheDocument();
  });

  it('shows rescue ship color from shared types', () => {
    render(<App />);
    expect(screen.getByText(/rescue ship color: red/i)).toBeInTheDocument();
  });
});
