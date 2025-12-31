import type { Puzzle, Move, StarRating } from './game.js';

/**
 * Player statistics.
 */
export interface PlayerStats {
  discordUserId: string;
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  averageMoves: number;
  averageTime: number; // seconds
}

/**
 * Solution submission from client.
 */
export interface SolutionSubmission {
  puzzleId: number;
  moves: Move[];
  timeSeconds: number;
}

/**
 * Response after submitting a solution.
 */
export interface SolutionResponse {
  valid: boolean;
  starRating: StarRating;
  stats: PlayerStats;
}

/**
 * GET /api/puzzle response.
 */
export interface PuzzleResponse {
  puzzle: Puzzle;
}

/**
 * GET /api/stats response.
 */
export interface StatsResponse {
  stats: PlayerStats;
}

/**
 * POST /api/solution request body.
 */
export interface SolutionRequest {
  solution: SolutionSubmission;
}

/**
 * Discord OAuth token exchange request.
 */
export interface TokenExchangeRequest {
  code: string;
}

/**
 * Discord OAuth token exchange response.
 */
export interface TokenExchangeResponse {
  accessToken: string;
  user: {
    id: string;
    username: string;
    avatar: string | null;
  };
}

/**
 * API error response.
 */
export interface ApiError {
  error: string;
  message: string;
}
