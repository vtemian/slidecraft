// Game types
export type {
  Position,
  ShipColor,
  Ship,
  Direction,
  ObstacleType,
  Asteroid,
  ForceField,
  Obstacle,
  Puzzle,
  Move,
  GameState,
  StarRating,
} from './types/game.js';

export { calculateStarRating } from './types/game.js';

// API types
export type {
  PlayerStats,
  SolutionSubmission,
  SolutionResponse,
  PuzzleResponse,
  StatsResponse,
  SolutionRequest,
  TokenExchangeRequest,
  TokenExchangeResponse,
  ApiError,
} from './types/api.js';

// Game logic
export { calculateDestination } from './game/movement.js';
export { checkWin, createGameState, applyMove, resetGameState } from './game/state.js';
