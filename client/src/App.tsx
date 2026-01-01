import { useEffect, useState } from 'react';
import type { Puzzle } from '@slidecraft/shared';
import { useDiscord } from './discord';
import { apiClient } from './api';
import { Game } from './components/Game';
import { LoadingScreen } from './components/LoadingScreen';

export default function App() {
  const { auth, isReady } = useDiscord();
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set Discord user ID for API calls
  useEffect(() => {
    if (auth.user) {
      apiClient.setDiscordUserId(auth.user.id);
    }
  }, [auth.user]);

  // Fetch today's puzzle
  useEffect(() => {
    if (!isReady || !auth.isAuthenticated) return;

    async function fetchPuzzle() {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getTodaysPuzzle();
        setPuzzle(response.puzzle);
      } catch (err) {
        console.error('Failed to fetch puzzle:', err);
        setError(err instanceof Error ? err.message : 'Failed to load puzzle');
      } finally {
        setLoading(false);
      }
    }

    fetchPuzzle();
  }, [isReady, auth.isAuthenticated]);

  if (!isReady) {
    return <LoadingScreen message="Connecting to Discord..." />;
  }

  if (auth.error) {
    return (
      <LoadingScreen
        error={auth.error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (loading) {
    return <LoadingScreen message="Loading today's puzzle..." />;
  }

  if (error || !puzzle) {
    return (
      <LoadingScreen
        error={error || 'No puzzle available'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div>
      {auth.user && (
        <div style={{ padding: '0.5rem', textAlign: 'right', opacity: 0.7 }}>
          Playing as {auth.user.username}
        </div>
      )}
      <Game puzzle={puzzle} />
    </div>
  );
}
