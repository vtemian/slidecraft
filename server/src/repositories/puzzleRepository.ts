import { query, queryOne } from '../db/connection.js';
import type { Puzzle, Ship, Obstacle, Position } from '@slidecraft/shared';

interface PuzzleRow {
  id: number;
  date: Date;
  board_layout: {
    ships: Ship[];
    obstacles: Obstacle[];
    astronaut: Position;
  };
  optimal_moves: number;
}

/**
 * Convert database row to Puzzle type.
 */
function rowToPuzzle(row: PuzzleRow): Puzzle {
  return {
    id: row.id,
    date: row.date.toISOString().split('T')[0],
    ships: row.board_layout.ships,
    obstacles: row.board_layout.obstacles,
    astronaut: row.board_layout.astronaut,
    optimalMoves: row.optimal_moves,
  };
}

/**
 * Get puzzle by date.
 */
export async function getPuzzleByDate(date: string): Promise<Puzzle | null> {
  const row = await queryOne<PuzzleRow>(
    'SELECT * FROM puzzles WHERE date = $1',
    [date]
  );

  return row ? rowToPuzzle(row) : null;
}

/**
 * Get today's puzzle (UTC date).
 */
export async function getTodaysPuzzle(): Promise<Puzzle | null> {
  const today = new Date().toISOString().split('T')[0];
  return getPuzzleByDate(today);
}

/**
 * Create a new puzzle.
 */
export async function createPuzzle(
  puzzle: Omit<Puzzle, 'id'>
): Promise<Puzzle> {
  const boardLayout = {
    ships: puzzle.ships,
    obstacles: puzzle.obstacles,
    astronaut: puzzle.astronaut,
  };

  const rows = await query<PuzzleRow>(
    `INSERT INTO puzzles (date, board_layout, optimal_moves)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [puzzle.date, JSON.stringify(boardLayout), puzzle.optimalMoves]
  );

  return rowToPuzzle(rows[0]);
}

/**
 * Get puzzle by ID.
 */
export async function getPuzzleById(id: number): Promise<Puzzle | null> {
  const row = await queryOne<PuzzleRow>(
    'SELECT * FROM puzzles WHERE id = $1',
    [id]
  );

  return row ? rowToPuzzle(row) : null;
}

/**
 * Get all puzzles (for admin/debugging).
 */
export async function getAllPuzzles(): Promise<Puzzle[]> {
  const rows = await query<PuzzleRow>(
    'SELECT * FROM puzzles ORDER BY date DESC'
  );

  return rows.map(rowToPuzzle);
}
