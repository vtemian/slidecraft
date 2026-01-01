import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DiscordProvider } from './discord';
import App from './App';

// Mock the API client
vi.mock('./api', () => ({
  apiClient: {
    setDiscordUserId: vi.fn(),
    getTodaysPuzzle: vi.fn().mockResolvedValue({
      puzzle: {
        id: 42,
        date: '2025-01-01',
        ships: [
          { color: 'red', position: { x: 2, y: 2 } },
          { color: 'blue', position: { x: 8, y: 5 } },
          { color: 'green', position: { x: 12, y: 10 } },
          { color: 'yellow', position: { x: 5, y: 14 } },
        ],
        obstacles: [],
        astronaut: { x: 14, y: 2 },
        optimalMoves: 3,
      },
    }),
    submitSolution: vi.fn().mockResolvedValue({
      valid: true,
      starRating: 5,
      stats: {
        discordUserId: 'mock-user-123',
        gamesPlayed: 1,
        gamesWon: 1,
        currentStreak: 1,
        maxStreak: 1,
        averageMoves: 3,
        averageTime: 30,
      },
    }),
  },
}));

const renderWithDiscord = (component: React.ReactElement) => {
  return render(
    <DiscordProvider skipInit>
      {component}
    </DiscordProvider>
  );
};

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the game after loading puzzle', async () => {
    renderWithDiscord(<App />);

    await waitFor(() => {
      expect(screen.getByText(/SlideCraft #42/)).toBeInTheDocument();
    });
  });

  it('shows move count starting at 0', async () => {
    renderWithDiscord(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Moves:/)).toBeInTheDocument();
    });
  });

  it('shows optimal moves', async () => {
    renderWithDiscord(<App />);

    await waitFor(() => {
      expect(screen.getByText(/\/ 3/)).toBeInTheDocument();
    });
  });

  it('renders reset button', async () => {
    renderWithDiscord(<App />);

    await waitFor(() => {
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });
  });

  it('shows username when authenticated', async () => {
    renderWithDiscord(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Playing as DevUser/)).toBeInTheDocument();
    });
  });

  it('shows direction buttons', async () => {
    renderWithDiscord(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText('Move up')).toBeInTheDocument();
      expect(screen.getByLabelText('Move down')).toBeInTheDocument();
      expect(screen.getByLabelText('Move left')).toBeInTheDocument();
      expect(screen.getByLabelText('Move right')).toBeInTheDocument();
    });
  });
});
