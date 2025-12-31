/**
 * Position on the 16x16 game board.
 * Origin (0,0) is top-left corner.
 */
export interface Position {
  x: number; // 0-15, column
  y: number; // 0-15, row
}

/**
 * Ship colors - each has a distinct silhouette for accessibility.
 * Red is always the "rescue ship" that must reach the astronaut.
 */
export type ShipColor = 'red' | 'blue' | 'green' | 'yellow';

/**
 * A ship piece on the board.
 */
export interface Ship {
  color: ShipColor;
  position: Position;
}

/**
 * Direction a ship can move.
 */
export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Obstacle types on the board.
 * - asteroid: Blocks entire cell (ships cannot enter)
 * - forceField: Blocks cell edge (ships stop at edge)
 */
export type ObstacleType = 'asteroid' | 'forceField';

/**
 * An asteroid obstacle - blocks an entire cell.
 */
export interface Asteroid {
  type: 'asteroid';
  position: Position;
}

/**
 * A force field obstacle - blocks movement across a cell edge.
 * The edge is on the specified side of the cell at position.
 */
export interface ForceField {
  type: 'forceField';
  position: Position;
  edge: Direction; // Which edge of the cell is blocked
}

export type Obstacle = Asteroid | ForceField;

/**
 * Complete puzzle configuration.
 */
export interface Puzzle {
  id: number;
  date: string; // ISO date string (YYYY-MM-DD)
  ships: Ship[];
  obstacles: Obstacle[];
  astronaut: Position; // Target position for rescue ship
  optimalMoves: number;
}

/**
 * A single move in the game.
 */
export interface Move {
  ship: ShipColor;
  direction: Direction;
}

/**
 * Current game state during play.
 */
export interface GameState {
  puzzle: Puzzle;
  ships: Ship[]; // Current positions (may differ from puzzle.ships)
  moves: Move[];
  moveCount: number;
  startTime: number; // Unix timestamp when game started
  completed: boolean;
  completionTime?: number; // Seconds to complete
}

/**
 * Star rating based on moves vs optimal.
 */
export type StarRating = 1 | 2 | 3 | 4 | 5;

/**
 * Calculate star rating from move count vs optimal.
 */
export function calculateStarRating(moves: number, optimal: number): StarRating {
  const diff = moves - optimal;
  if (diff === 0) return 5;
  if (diff === 1) return 4;
  if (diff <= 3) return 3;
  if (diff <= 5) return 2;
  return 1;
}
