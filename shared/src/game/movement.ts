import type { Ship, Obstacle, Direction, Position } from '../types/game.js';

/**
 * Direction vectors for movement.
 */
const DIRECTION_VECTORS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * Check if a position is within board bounds.
 */
function isInBounds(pos: Position, boardSize: number): boolean {
  return pos.x >= 0 && pos.x < boardSize && pos.y >= 0 && pos.y < boardSize;
}

/**
 * Check if a position is occupied by an asteroid.
 */
function isAsteroid(pos: Position, obstacles: Obstacle[]): boolean {
  return obstacles.some(
    (o) => o.type === 'asteroid' && o.position.x === pos.x && o.position.y === pos.y
  );
}

/**
 * Check if a position is occupied by another ship.
 */
function isOccupiedByShip(pos: Position, ships: Ship[], excludeShip: Ship): boolean {
  return ships.some(
    (s) =>
      s.color !== excludeShip.color &&
      s.position.x === pos.x &&
      s.position.y === pos.y
  );
}

/**
 * Check if movement is blocked by a force field.
 * Force fields block movement across cell edges.
 */
function isBlockedByForceField(
  from: Position,
  to: Position,
  direction: Direction,
  obstacles: Obstacle[]
): boolean {
  // Force field on the 'from' cell blocking exit in this direction
  const exitBlocked = obstacles.some(
    (o) =>
      o.type === 'forceField' &&
      o.position.x === from.x &&
      o.position.y === from.y &&
      o.edge === direction
  );

  // Force field on the 'to' cell blocking entry from opposite direction
  const oppositeDirection: Record<Direction, Direction> = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left',
  };

  const entryBlocked = obstacles.some(
    (o) =>
      o.type === 'forceField' &&
      o.position.x === to.x &&
      o.position.y === to.y &&
      o.edge === oppositeDirection[direction]
  );

  return exitBlocked || entryBlocked;
}

/**
 * Calculate where a ship will end up when moved in a direction.
 * Ships slide until they hit an obstacle, another ship, or the board edge.
 */
export function calculateDestination(
  ship: Ship,
  direction: Direction,
  ships: Ship[],
  obstacles: Obstacle[],
  boardSize: number = 16
): Position {
  const vector = DIRECTION_VECTORS[direction];
  let current = { ...ship.position };

  while (true) {
    const next: Position = {
      x: current.x + vector.x,
      y: current.y + vector.y,
    };

    // Stop at board edge
    if (!isInBounds(next, boardSize)) {
      break;
    }

    // Stop before asteroid
    if (isAsteroid(next, obstacles)) {
      break;
    }

    // Stop before another ship
    if (isOccupiedByShip(next, ships, ship)) {
      break;
    }

    // Stop at force field
    if (isBlockedByForceField(current, next, direction, obstacles)) {
      break;
    }

    current = next;
  }

  return current;
}
