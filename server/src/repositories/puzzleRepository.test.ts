import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { pool } from '../db/connection';
import { runMigrations } from '../db/migrate';
import {
  getPuzzleByDate,
  createPuzzle,
  getTodaysPuzzle,
} from './puzzleRepository';
import type { Puzzle } from '@slidecraft/shared';

// Use a test database
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/slidecraft_test';

describe('puzzleRepository', () => {
  beforeAll(async () => {
    await runMigrations();
    // Clean up test data
    await pool.query('DELETE FROM solutions');
    await pool.query('DELETE FROM puzzles');
  });

  afterAll(async () => {
    await pool.end();
  });

  const testPuzzle: Omit<Puzzle, 'id'> = {
    date: '2025-01-15',
    ships: [
      { color: 'red', position: { x: 0, y: 0 } },
      { color: 'blue', position: { x: 5, y: 5 } },
      { color: 'green', position: { x: 10, y: 10 } },
      { color: 'yellow', position: { x: 15, y: 15 } },
    ],
    obstacles: [
      { type: 'asteroid', position: { x: 3, y: 3 } },
    ],
    astronaut: { x: 15, y: 0 },
    optimalMoves: 5,
  };

  describe('createPuzzle', () => {
    it('creates a puzzle and returns it with id', async () => {
      const puzzle = await createPuzzle(testPuzzle);

      expect(puzzle.id).toBeGreaterThan(0);
      expect(puzzle.date).toBe(testPuzzle.date);
      expect(puzzle.ships).toEqual(testPuzzle.ships);
      expect(puzzle.obstacles).toEqual(testPuzzle.obstacles);
      expect(puzzle.astronaut).toEqual(testPuzzle.astronaut);
      expect(puzzle.optimalMoves).toBe(testPuzzle.optimalMoves);
    });
  });

  describe('getPuzzleByDate', () => {
    it('returns puzzle for given date', async () => {
      const puzzle = await getPuzzleByDate('2025-01-15');

      expect(puzzle).not.toBeNull();
      expect(puzzle?.date).toBe('2025-01-15');
    });

    it('returns null for non-existent date', async () => {
      const puzzle = await getPuzzleByDate('1999-01-01');

      expect(puzzle).toBeNull();
    });
  });
});
