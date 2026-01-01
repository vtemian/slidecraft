import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { pool } from '../db/connection';
import { runMigrations } from '../db/migrate';
import { createPuzzle } from './puzzleRepository';
import { getOrCreatePlayer } from './playerRepository';
import {
  submitSolution,
  getSolutionForPlayer,
  hasPlayerSolvedPuzzle,
} from './solutionRepository';
import type { Move } from '@slidecraft/shared';

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/slidecraft_test';

describe('solutionRepository', () => {
  let puzzleId: number;
  let discordUserId: string;

  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM solutions');
    await pool.query('DELETE FROM puzzles');
    await pool.query('DELETE FROM players');

    // Create test puzzle
    const puzzle = await createPuzzle({
      date: '2025-02-01',
      ships: [
        { color: 'red', position: { x: 0, y: 0 } },
        { color: 'blue', position: { x: 5, y: 5 } },
        { color: 'green', position: { x: 10, y: 10 } },
        { color: 'yellow', position: { x: 15, y: 15 } },
      ],
      obstacles: [],
      astronaut: { x: 15, y: 0 },
      optimalMoves: 1,
    });
    puzzleId = puzzle.id;

    // Create test player
    discordUserId = 'test-player-' + Date.now();
    await getOrCreatePlayer(discordUserId, 'TestPlayer');
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('submitSolution', () => {
    it('records a valid solution', async () => {
      const moves: Move[] = [{ ship: 'red', direction: 'right' }];

      const result = await submitSolution(discordUserId, puzzleId, moves, 30);

      expect(result.valid).toBe(true);
      expect(result.starRating).toBe(5); // Optimal solution
    });

    it('rejects duplicate solution for same puzzle', async () => {
      const moves: Move[] = [{ ship: 'red', direction: 'right' }];

      await submitSolution(discordUserId, puzzleId, moves, 30);
      const result = await submitSolution(discordUserId, puzzleId, moves, 25);

      expect(result.valid).toBe(false);
    });
  });

  describe('hasPlayerSolvedPuzzle', () => {
    it('returns false when not solved', async () => {
      const solved = await hasPlayerSolvedPuzzle(discordUserId, puzzleId);
      expect(solved).toBe(false);
    });

    it('returns true when solved', async () => {
      const moves: Move[] = [{ ship: 'red', direction: 'right' }];
      await submitSolution(discordUserId, puzzleId, moves, 30);

      const solved = await hasPlayerSolvedPuzzle(discordUserId, puzzleId);
      expect(solved).toBe(true);
    });
  });
});
