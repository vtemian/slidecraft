import type { Puzzle, GameState, Ship, ShipColor, Direction, Move, Position } from '../types/game.js';
import { calculateDestination } from './movement.js';

/**
 * Check if the game is won (red ship on astronaut).
 */
export function checkWin(ships: Ship[], astronaut: Position): boolean {
  const redShip = ships.find((s) => s.color === 'red');
  if (!redShip) return false;
  return redShip.position.x === astronaut.x && redShip.position.y === astronaut.y;
}

/**
 * Create initial game state from a puzzle.
 */
export function createGameState(puzzle: Puzzle): GameState {
  return {
    puzzle,
    ships: puzzle.ships.map((s) => ({
      color: s.color,
      position: { ...s.position },
    })),
    moves: [],
    moveCount: 0,
    startTime: Date.now(),
    completed: false,
  };
}

/**
 * Apply a move to the game state, returning a new state.
 * Does not mutate the original state.
 */
export function applyMove(
  state: GameState,
  shipColor: ShipColor,
  direction: Direction
): GameState {
  const shipIndex = state.ships.findIndex((s) => s.color === shipColor);
  if (shipIndex === -1) return state;

  const ship = state.ships[shipIndex];
  const newPosition = calculateDestination(
    ship,
    direction,
    state.ships,
    state.puzzle.obstacles
  );

  // If ship didn't move, don't count it
  if (newPosition.x === ship.position.x && newPosition.y === ship.position.y) {
    return state;
  }

  const newShips = state.ships.map((s, i) =>
    i === shipIndex ? { ...s, position: newPosition } : { ...s, position: { ...s.position } }
  );

  const newMove: Move = { ship: shipColor, direction };
  const isWin = checkWin(newShips, state.puzzle.astronaut);

  return {
    ...state,
    ships: newShips,
    moves: [...state.moves, newMove],
    moveCount: state.moveCount + 1,
    completed: isWin,
    completionTime: isWin ? Math.floor((Date.now() - state.startTime) / 1000) : undefined,
  };
}

/**
 * Reset game state to initial positions (keeps timer running).
 */
export function resetGameState(state: GameState): GameState {
  return {
    ...state,
    ships: state.puzzle.ships.map((s) => ({
      color: s.color,
      position: { ...s.position },
    })),
    moves: [],
    moveCount: 0,
    completed: false,
    completionTime: undefined,
  };
}
