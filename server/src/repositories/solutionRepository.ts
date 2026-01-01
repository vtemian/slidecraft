import { query, queryOne } from '../db/connection.js';
import { getPlayerDbId, updatePlayerStats, getPlayerByDiscordId } from './playerRepository.js';
import { getPuzzleById } from './puzzleRepository.js';
import { calculateStarRating, createGameState, applyMove, checkWin } from '@slidecraft/shared';
import type { Move, SolutionResponse, StarRating } from '@slidecraft/shared';

interface SolutionRow {
  id: number;
  player_id: number;
  puzzle_id: number;
  moves: Move[];
  move_count: number;
  time_seconds: number;
  solved_at: Date;
}

/**
 * Check if a player has already solved a puzzle.
 */
export async function hasPlayerSolvedPuzzle(
  discordUserId: string,
  puzzleId: number
): Promise<boolean> {
  const playerId = await getPlayerDbId(discordUserId);
  if (!playerId) return false;

  const row = await queryOne<{ id: number }>(
    'SELECT id FROM solutions WHERE player_id = $1 AND puzzle_id = $2',
    [playerId, puzzleId]
  );

  return row !== null;
}

/**
 * Get a player's solution for a puzzle.
 */
export async function getSolutionForPlayer(
  discordUserId: string,
  puzzleId: number
): Promise<SolutionRow | null> {
  const playerId = await getPlayerDbId(discordUserId);
  if (!playerId) return null;

  return queryOne<SolutionRow>(
    'SELECT * FROM solutions WHERE player_id = $1 AND puzzle_id = $2',
    [playerId, puzzleId]
  );
}

/**
 * Submit a solution for a puzzle.
 * Returns validation result and updated player stats.
 */
export async function submitSolution(
  discordUserId: string,
  puzzleId: number,
  moves: Move[],
  timeSeconds: number
): Promise<SolutionResponse> {
  // Check if already solved
  const alreadySolved = await hasPlayerSolvedPuzzle(discordUserId, puzzleId);
  if (alreadySolved) {
    const stats = await getPlayerByDiscordId(discordUserId);
    return {
      valid: false,
      starRating: 1,
      stats: stats!,
    };
  }

  // Get puzzle to calculate star rating
  const puzzle = await getPuzzleById(puzzleId);
  if (!puzzle) {
    const stats = await getPlayerByDiscordId(discordUserId);
    return {
      valid: false,
      starRating: 1,
      stats: stats!,
    };
  }

  // Validate that the moves actually solve the puzzle
  let state = createGameState(puzzle);
  for (const move of moves) {
    state = applyMove(state, move.ship, move.direction);
  }
  if (!checkWin(state.ships, puzzle.astronaut)) {
    const stats = await getPlayerByDiscordId(discordUserId);
    return {
      valid: false,
      starRating: 1,
      stats: stats!,
    };
  }

  // Get player ID
  const playerId = await getPlayerDbId(discordUserId);
  if (!playerId) {
    const stats = await getPlayerByDiscordId(discordUserId);
    return {
      valid: false,
      starRating: 1,
      stats: stats!,
    };
  }

  // Record solution
  const moveCount = moves.length;
  await query(
    `INSERT INTO solutions (player_id, puzzle_id, moves, move_count, time_seconds)
     VALUES ($1, $2, $3, $4, $5)`,
    [playerId, puzzleId, JSON.stringify(moves), moveCount, timeSeconds]
  );

  // Update player stats (always a win since they solved it)
  const updatedStats = await updatePlayerStats(discordUserId, true);

  // Calculate star rating
  const starRating = calculateStarRating(moveCount, puzzle.optimalMoves);

  return {
    valid: true,
    starRating,
    stats: updatedStats,
  };
}

/**
 * Get player's average moves and time across all solutions.
 */
export async function getPlayerAverages(
  discordUserId: string
): Promise<{ averageMoves: number; averageTime: number }> {
  const playerId = await getPlayerDbId(discordUserId);
  if (!playerId) {
    return { averageMoves: 0, averageTime: 0 };
  }

  const row = await queryOne<{ avg_moves: string; avg_time: string }>(
    `SELECT 
       COALESCE(AVG(move_count), 0) as avg_moves,
       COALESCE(AVG(time_seconds), 0) as avg_time
     FROM solutions WHERE player_id = $1`,
    [playerId]
  );

  return {
    averageMoves: row ? parseFloat(row.avg_moves) : 0,
    averageTime: row ? parseFloat(row.avg_time) : 0,
  };
}
