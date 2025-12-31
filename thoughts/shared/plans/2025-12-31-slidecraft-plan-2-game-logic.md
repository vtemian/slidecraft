# SlideCraft Implementation Plan 2: Game Logic & Board

**Goal:** Implement core game mechanics (movement rules, collision detection) and render the game board with ships and obstacles.

**Architecture:** Pure functions for game logic in shared package (testable without UI). React components for board rendering with CSS Grid layout. Framer Motion for ship movement animations.

**Design:** [thoughts/shared/designs/2025-12-31-slidecraft-design.md](../designs/2025-12-31-slidecraft-design.md)

**Prerequisites:** Plan 1 completed (monorepo structure, shared types, client/server skeletons)

**Done when:**
- Ship movement logic correctly handles all obstacle types
- Board renders 16x16 grid with ships, asteroids, force fields, astronaut
- Ships can be selected and moved with keyboard/buttons
- Animations smoothly show ship sliding
- Win detection triggers when rescue ship reaches astronaut

---

## Task 1: Implement Ship Movement Logic

**Files:**
- Create: `shared/src/game/movement.ts`
- Create: `shared/src/game/movement.test.ts`
- Modify: `shared/src/index.ts`

**Step 1: Write failing test for basic movement**

Create file `shared/src/game/movement.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import { calculateDestination } from './movement';
import type { Ship, Obstacle, Position } from '../types/game';

describe('calculateDestination', () => {
  const boardSize = 16;

  describe('movement to board edge', () => {
    it('moves ship right to board edge when no obstacles', () => {
      const ship: Ship = { color: 'red', position: { x: 5, y: 5 } };
      const ships: Ship[] = [ship];
      const obstacles: Obstacle[] = [];

      const dest = calculateDestination(ship, 'right', ships, obstacles, boardSize);
      expect(dest).toEqual({ x: 15, y: 5 });
    });

    it('moves ship left to board edge when no obstacles', () => {
      const ship: Ship = { color: 'red', position: { x: 5, y: 5 } };
      const ships: Ship[] = [ship];
      const obstacles: Obstacle[] = [];

      const dest = calculateDestination(ship, 'left', ships, obstacles, boardSize);
      expect(dest).toEqual({ x: 0, y: 5 });
    });

    it('moves ship up to board edge when no obstacles', () => {
      const ship: Ship = { color: 'red', position: { x: 5, y: 5 } };
      const ships: Ship[] = [ship];
      const obstacles: Obstacle[] = [];

      const dest = calculateDestination(ship, 'up', ships, obstacles, boardSize);
      expect(dest).toEqual({ x: 5, y: 0 });
    });

    it('moves ship down to board edge when no obstacles', () => {
      const ship: Ship = { color: 'red', position: { x: 5, y: 5 } };
      const ships: Ship[] = [ship];
      const obstacles: Obstacle[] = [];

      const dest = calculateDestination(ship, 'down', ships, obstacles, boardSize);
      expect(dest).toEqual({ x: 5, y: 15 });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test shared/src/game/movement.test.ts`
Expected: FAIL - module not found

**Step 3: Implement basic movement**

Create file `shared/src/game/movement.ts`:

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `bun test shared/src/game/movement.test.ts`
Expected: All 4 tests pass

**Step 5: Commit basic movement**

```bash
git add shared/src/game/
git commit -m "feat(shared): add basic ship movement to board edges"
```

---

## Task 2: Add Obstacle Collision Tests

**Files:**
- Modify: `shared/src/game/movement.test.ts`

**Step 1: Add asteroid collision tests**

Add to `shared/src/game/movement.test.ts`:

```typescript
  describe('asteroid collisions', () => {
    it('stops before asteroid when moving right', () => {
      const ship: Ship = { color: 'red', position: { x: 5, y: 5 } };
      const ships: Ship[] = [ship];
      const obstacles: Obstacle[] = [
        { type: 'asteroid', position: { x: 10, y: 5 } },
      ];

      const dest = calculateDestination(ship, 'right', ships, obstacles, boardSize);
      expect(dest).toEqual({ x: 9, y: 5 });
    });

    it('stops before asteroid when moving up', () => {
      const ship: Ship = { color: 'red', position: { x: 5, y: 10 } };
      const ships: Ship[] = [ship];
      const obstacles: Obstacle[] = [
        { type: 'asteroid', position: { x: 5, y: 3 } },
      ];

      const dest = calculateDestination(ship, 'up', ships, obstacles, boardSize);
      expect(dest).toEqual({ x: 5, y: 4 });
    });

    it('does not move if asteroid is adjacent', () => {
      const ship: Ship = { color: 'red', position: { x: 5, y: 5 } };
      const ships: Ship[] = [ship];
      const obstacles: Obstacle[] = [
        { type: 'asteroid', position: { x: 6, y: 5 } },
      ];

      const dest = calculateDestination(ship, 'right', ships, obstacles, boardSize);
      expect(dest).toEqual({ x: 5, y: 5 });
    });
  });
```

**Step 2: Run tests**

Run: `bun test shared/src/game/movement.test.ts`
Expected: All tests pass

**Step 3: Add ship collision tests**

Add to `shared/src/game/movement.test.ts`:

```typescript
  describe('ship collisions', () => {
    it('stops before another ship when moving right', () => {
      const redShip: Ship = { color: 'red', position: { x: 5, y: 5 } };
      const blueShip: Ship = { color: 'blue', position: { x: 10, y: 5 } };
      const ships: Ship[] = [redShip, blueShip];
      const obstacles: Obstacle[] = [];

      const dest = calculateDestination(redShip, 'right', ships, obstacles, boardSize);
      expect(dest).toEqual({ x: 9, y: 5 });
    });

    it('stops before another ship when moving down', () => {
      const redShip: Ship = { color: 'red', position: { x: 5, y: 2 } };
      const greenShip: Ship = { color: 'green', position: { x: 5, y: 8 } };
      const ships: Ship[] = [redShip, greenShip];
      const obstacles: Obstacle[] = [];

      const dest = calculateDestination(redShip, 'down', ships, obstacles, boardSize);
      expect(dest).toEqual({ x: 5, y: 7 });
    });

    it('ignores self when checking collisions', () => {
      const ship: Ship = { color: 'red', position: { x: 5, y: 5 } };
      const ships: Ship[] = [ship];
      const obstacles: Obstacle[] = [];

      const dest = calculateDestination(ship, 'right', ships, obstacles, boardSize);
      expect(dest).toEqual({ x: 15, y: 5 });
    });
  });
```

**Step 4: Run tests**

Run: `bun test shared/src/game/movement.test.ts`
Expected: All tests pass

**Step 5: Add force field tests**

Add to `shared/src/game/movement.test.ts`:

```typescript
  describe('force field collisions', () => {
    it('stops at force field on exit edge', () => {
      const ship: Ship = { color: 'red', position: { x: 5, y: 5 } };
      const ships: Ship[] = [ship];
      const obstacles: Obstacle[] = [
        { type: 'forceField', position: { x: 7, y: 5 }, edge: 'right' },
      ];

      const dest = calculateDestination(ship, 'right', ships, obstacles, boardSize);
      expect(dest).toEqual({ x: 7, y: 5 });
    });

    it('stops at force field on entry edge', () => {
      const ship: Ship = { color: 'red', position: { x: 5, y: 5 } };
      const ships: Ship[] = [ship];
      const obstacles: Obstacle[] = [
        { type: 'forceField', position: { x: 10, y: 5 }, edge: 'left' },
      ];

      const dest = calculateDestination(ship, 'right', ships, obstacles, boardSize);
      expect(dest).toEqual({ x: 9, y: 5 });
    });

    it('can pass through force field perpendicular to movement', () => {
      const ship: Ship = { color: 'red', position: { x: 5, y: 5 } };
      const ships: Ship[] = [ship];
      const obstacles: Obstacle[] = [
        { type: 'forceField', position: { x: 8, y: 5 }, edge: 'up' },
      ];

      const dest = calculateDestination(ship, 'right', ships, obstacles, boardSize);
      expect(dest).toEqual({ x: 15, y: 5 });
    });
  });
```

**Step 6: Run tests**

Run: `bun test shared/src/game/movement.test.ts`
Expected: All tests pass

**Step 7: Commit collision tests**

```bash
git add shared/src/game/movement.test.ts
git commit -m "test(shared): add comprehensive collision tests for movement"
```

---

## Task 3: Add Win Detection and Game State Management

**Files:**
- Create: `shared/src/game/state.ts`
- Create: `shared/src/game/state.test.ts`
- Modify: `shared/src/index.ts`

**Step 1: Write failing test for win detection**

Create file `shared/src/game/state.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import { checkWin, createGameState, applyMove } from './state';
import type { Puzzle, Ship } from '../types/game';

const createTestPuzzle = (): Puzzle => ({
  id: 1,
  date: '2025-01-01',
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

describe('checkWin', () => {
  it('returns true when red ship is on astronaut', () => {
    const ships: Ship[] = [
      { color: 'red', position: { x: 15, y: 0 } },
      { color: 'blue', position: { x: 5, y: 5 } },
    ];
    const astronaut = { x: 15, y: 0 };

    expect(checkWin(ships, astronaut)).toBe(true);
  });

  it('returns false when red ship is not on astronaut', () => {
    const ships: Ship[] = [
      { color: 'red', position: { x: 0, y: 0 } },
      { color: 'blue', position: { x: 15, y: 0 } },
    ];
    const astronaut = { x: 15, y: 0 };

    expect(checkWin(ships, astronaut)).toBe(false);
  });

  it('returns false when non-red ship is on astronaut', () => {
    const ships: Ship[] = [
      { color: 'red', position: { x: 0, y: 0 } },
      { color: 'blue', position: { x: 15, y: 0 } },
    ];
    const astronaut = { x: 15, y: 0 };

    expect(checkWin(ships, astronaut)).toBe(false);
  });
});

describe('createGameState', () => {
  it('creates initial game state from puzzle', () => {
    const puzzle = createTestPuzzle();
    const state = createGameState(puzzle);

    expect(state.puzzle).toBe(puzzle);
    expect(state.ships).toEqual(puzzle.ships);
    expect(state.moves).toEqual([]);
    expect(state.moveCount).toBe(0);
    expect(state.completed).toBe(false);
    expect(state.startTime).toBeGreaterThan(0);
  });

  it('creates deep copy of ships', () => {
    const puzzle = createTestPuzzle();
    const state = createGameState(puzzle);

    state.ships[0].position.x = 99;
    expect(puzzle.ships[0].position.x).toBe(0);
  });
});

describe('applyMove', () => {
  it('updates ship position after move', () => {
    const puzzle = createTestPuzzle();
    const state = createGameState(puzzle);

    const newState = applyMove(state, 'red', 'right');

    expect(newState.ships[0].position).toEqual({ x: 15, y: 0 });
    expect(newState.moveCount).toBe(1);
    expect(newState.moves).toEqual([{ ship: 'red', direction: 'right' }]);
  });

  it('detects win after move', () => {
    const puzzle = createTestPuzzle();
    const state = createGameState(puzzle);

    const newState = applyMove(state, 'red', 'right');

    expect(newState.completed).toBe(true);
    expect(newState.completionTime).toBeDefined();
  });

  it('does not mutate original state', () => {
    const puzzle = createTestPuzzle();
    const state = createGameState(puzzle);

    applyMove(state, 'red', 'right');

    expect(state.ships[0].position).toEqual({ x: 0, y: 0 });
    expect(state.moveCount).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test shared/src/game/state.test.ts`
Expected: FAIL - module not found

**Step 3: Implement game state management**

Create file `shared/src/game/state.ts`:

```typescript
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
```

**Step 4: Run tests to verify they pass**

Run: `bun test shared/src/game/state.test.ts`
Expected: All tests pass

**Step 5: Export game functions from shared**

Update `shared/src/index.ts`:

```typescript
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
```

**Step 6: Commit game state management**

```bash
git add shared/src/
git commit -m "feat(shared): add game state management and win detection"
```

---

## Task 4: Create Board Grid Component

**Files:**
- Create: `client/src/components/Board/Board.tsx`
- Create: `client/src/components/Board/Board.css`
- Create: `client/src/components/Board/index.ts`

**Step 1: Create Board CSS**

Create file `client/src/components/Board/Board.css`:

```css
.board {
  display: grid;
  grid-template-columns: repeat(16, 1fr);
  grid-template-rows: repeat(16, 1fr);
  gap: 1px;
  background: #2a2a4a;
  border: 2px solid #4a4a6a;
  border-radius: 8px;
  padding: 4px;
  aspect-ratio: 1;
  max-width: min(90vw, 90vh, 600px);
  max-height: min(90vw, 90vh, 600px);
}

.cell {
  background: #1a1a2e;
  border-radius: 2px;
  position: relative;
}

.cell--astronaut {
  background: radial-gradient(circle, #3a3a5e 0%, #1a1a2e 70%);
}

.cell--astronaut::after {
  content: '';
  position: absolute;
  inset: 20%;
  background: #ffd700;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1); }
}

.asteroid {
  position: absolute;
  inset: 10%;
  background: #6a6a8a;
  border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
  box-shadow: inset -2px -2px 4px rgba(0,0,0,0.3);
}

.force-field {
  position: absolute;
  background: linear-gradient(90deg, transparent, #00ffff, transparent);
  opacity: 0.7;
}

.force-field--up {
  top: 0;
  left: 10%;
  right: 10%;
  height: 3px;
}

.force-field--down {
  bottom: 0;
  left: 10%;
  right: 10%;
  height: 3px;
}

.force-field--left {
  left: 0;
  top: 10%;
  bottom: 10%;
  width: 3px;
  background: linear-gradient(180deg, transparent, #00ffff, transparent);
}

.force-field--right {
  right: 0;
  top: 10%;
  bottom: 10%;
  width: 3px;
  background: linear-gradient(180deg, transparent, #00ffff, transparent);
}
```

**Step 2: Create Board component**

Create file `client/src/components/Board/Board.tsx`:

```typescript
import type { Position, Obstacle } from '@slidecraft/shared';
import './Board.css';

interface BoardProps {
  obstacles: Obstacle[];
  astronaut: Position;
  children?: React.ReactNode;
}

export function Board({ obstacles, astronaut, children }: BoardProps) {
  const cells = [];

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const isAstronaut = astronaut.x === x && astronaut.y === y;
      const cellObstacles = obstacles.filter(
        (o) => o.position.x === x && o.position.y === y
      );

      cells.push(
        <div
          key={`${x}-${y}`}
          className={`cell ${isAstronaut ? 'cell--astronaut' : ''}`}
          data-x={x}
          data-y={y}
        >
          {cellObstacles.map((obstacle, i) => {
            if (obstacle.type === 'asteroid') {
              return <div key={i} className="asteroid" />;
            }
            return (
              <div
                key={i}
                className={`force-field force-field--${obstacle.edge}`}
              />
            );
          })}
        </div>
      );
    }
  }

  return (
    <div className="board">
      {cells}
      {children}
    </div>
  );
}
```

**Step 3: Create index export**

Create file `client/src/components/Board/index.ts`:

```typescript
export { Board } from './Board';
```

**Step 4: Commit Board component**

```bash
git add client/src/components/
git commit -m "feat(client): add Board grid component with obstacles"
```

---

## Task 5: Create Ship Component with Animation

**Files:**
- Create: `client/src/components/Ship/Ship.tsx`
- Create: `client/src/components/Ship/Ship.css`
- Create: `client/src/components/Ship/index.ts`

**Step 1: Create Ship CSS**

Create file `client/src/components/Ship/Ship.css`:

```css
.ship {
  position: absolute;
  width: calc(100% / 16 - 2px);
  height: calc(100% / 16 - 2px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: filter 0.2s;
}

.ship:hover {
  filter: brightness(1.2);
}

.ship--selected {
  filter: brightness(1.3);
}

.ship--selected .ship__body {
  box-shadow: 0 0 12px currentColor;
}

.ship__body {
  width: 70%;
  height: 70%;
  border-radius: 4px;
  position: relative;
}

/* Red ship - triangle/arrow shape */
.ship--red .ship__body {
  background: #ff4444;
  clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
  color: #ff4444;
}

/* Blue ship - diamond shape */
.ship--blue .ship__body {
  background: #4444ff;
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  color: #4444ff;
}

/* Green ship - circle shape */
.ship--green .ship__body {
  background: #44ff44;
  border-radius: 50%;
  color: #44ff44;
}

/* Yellow ship - square shape */
.ship--yellow .ship__body {
  background: #ffff44;
  border-radius: 2px;
  color: #ffff44;
}
```

**Step 2: Create Ship component**

Create file `client/src/components/Ship/Ship.tsx`:

```typescript
import { motion } from 'framer-motion';
import type { Ship as ShipType } from '@slidecraft/shared';
import './Ship.css';

interface ShipProps {
  ship: ShipType;
  selected: boolean;
  onClick: () => void;
  cellSize: number;
}

export function Ship({ ship, selected, onClick, cellSize }: ShipProps) {
  // Calculate pixel position from grid position
  // Account for board padding (4px) and gap (1px per cell)
  const padding = 4;
  const gap = 1;
  const x = padding + ship.position.x * (cellSize + gap);
  const y = padding + ship.position.y * (cellSize + gap);

  return (
    <motion.div
      className={`ship ship--${ship.color} ${selected ? 'ship--selected' : ''}`}
      style={{
        width: cellSize,
        height: cellSize,
      }}
      animate={{ x, y }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      onClick={onClick}
      role="button"
      aria-label={`${ship.color} ship${selected ? ' (selected)' : ''}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      <div className="ship__body" />
    </motion.div>
  );
}
```

**Step 3: Create index export**

Create file `client/src/components/Ship/index.ts`:

```typescript
export { Ship } from './Ship';
```

**Step 4: Commit Ship component**

```bash
git add client/src/components/Ship/
git commit -m "feat(client): add Ship component with Framer Motion animation"
```

---

## Task 6: Create Game Container Component

**Files:**
- Create: `client/src/components/Game/Game.tsx`
- Create: `client/src/components/Game/Game.css`
- Create: `client/src/components/Game/index.ts`
- Create: `client/src/components/Game/useGame.ts`

**Step 1: Create useGame hook**

Create file `client/src/components/Game/useGame.ts`:

```typescript
import { useState, useCallback, useEffect, useRef } from 'react';
import type { Puzzle, GameState, ShipColor, Direction } from '@slidecraft/shared';
import { createGameState, applyMove, resetGameState } from '@slidecraft/shared';

export function useGame(puzzle: Puzzle | null) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedShip, setSelectedShip] = useState<ShipColor | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(0);

  // Initialize game state when puzzle loads
  useEffect(() => {
    if (puzzle) {
      setGameState(createGameState(puzzle));
      setSelectedShip(null);
    }
  }, [puzzle]);

  // Calculate cell size based on board dimensions
  useEffect(() => {
    const updateCellSize = () => {
      if (boardRef.current) {
        const boardWidth = boardRef.current.offsetWidth;
        const padding = 8; // 4px on each side
        const gaps = 15; // 15 gaps between 16 cells
        const availableWidth = boardWidth - padding - gaps;
        setCellSize(availableWidth / 16);
      }
    };

    updateCellSize();
    window.addEventListener('resize', updateCellSize);
    return () => window.removeEventListener('resize', updateCellSize);
  }, []);

  const selectShip = useCallback((color: ShipColor) => {
    setSelectedShip((current) => (current === color ? null : color));
  }, []);

  const moveShip = useCallback(
    (direction: Direction) => {
      if (!gameState || !selectedShip || gameState.completed) return;

      setGameState((current) => {
        if (!current) return current;
        return applyMove(current, selectedShip, direction);
      });
    },
    [gameState, selectedShip]
  );

  const reset = useCallback(() => {
    if (!gameState) return;
    setGameState(resetGameState(gameState));
    setSelectedShip(null);
  }, [gameState]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedShip || !gameState || gameState.completed) return;

      const directionMap: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right',
      };

      const direction = directionMap[e.key];
      if (direction) {
        e.preventDefault();
        moveShip(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedShip, gameState, moveShip]);

  return {
    gameState,
    selectedShip,
    selectShip,
    moveShip,
    reset,
    boardRef,
    cellSize,
  };
}
```

**Step 2: Create Game CSS**

Create file `client/src/components/Game/Game.css`:

```css
.game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
}

.game__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 600px;
}

.game__title {
  font-size: 1.5rem;
  font-weight: bold;
}

.game__stats {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
  opacity: 0.8;
}

.game__board-container {
  position: relative;
  width: 100%;
  max-width: 600px;
}

.game__controls {
  display: flex;
  gap: 0.5rem;
}

.game__button {
  padding: 0.5rem 1rem;
  background: #4a4a6a;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

.game__button:hover {
  background: #5a5a7a;
}

.game__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.game__direction-buttons {
  display: grid;
  grid-template-areas:
    ". up ."
    "left . right"
    ". down .";
  gap: 0.25rem;
}

.game__direction-button {
  width: 3rem;
  height: 3rem;
  background: #4a4a6a;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 1.5rem;
  transition: background 0.2s;
}

.game__direction-button:hover:not(:disabled) {
  background: #5a5a7a;
}

.game__direction-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.game__direction-button--up { grid-area: up; }
.game__direction-button--down { grid-area: down; }
.game__direction-button--left { grid-area: left; }
.game__direction-button--right { grid-area: right; }

.game__win-message {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  z-index: 100;
}

.game__win-title {
  font-size: 2rem;
  color: #ffd700;
  margin-bottom: 1rem;
}

.game__win-stats {
  font-size: 1.2rem;
  margin-bottom: 1rem;
}
```

**Step 3: Create Game component**

Create file `client/src/components/Game/Game.tsx`:

```typescript
import type { Puzzle, Direction } from '@slidecraft/shared';
import { Board } from '../Board';
import { Ship } from '../Ship';
import { useGame } from './useGame';
import './Game.css';

interface GameProps {
  puzzle: Puzzle;
}

export function Game({ puzzle }: GameProps) {
  const {
    gameState,
    selectedShip,
    selectShip,
    moveShip,
    reset,
    boardRef,
    cellSize,
  } = useGame(puzzle);

  if (!gameState) return null;

  const directions: Direction[] = ['up', 'down', 'left', 'right'];
  const directionSymbols: Record<Direction, string> = {
    up: '↑',
    down: '↓',
    left: '←',
    right: '→',
  };

  return (
    <div className="game">
      <div className="game__header">
        <h1 className="game__title">SlideCraft #{puzzle.id}</h1>
        <div className="game__stats">
          <span>Moves: {gameState.moveCount}</span>
          <span>Optimal: {puzzle.optimalMoves}</span>
        </div>
      </div>

      <div className="game__board-container" ref={boardRef}>
        <Board obstacles={puzzle.obstacles} astronaut={puzzle.astronaut}>
          {gameState.ships.map((ship) => (
            <Ship
              key={ship.color}
              ship={ship}
              selected={selectedShip === ship.color}
              onClick={() => selectShip(ship.color)}
              cellSize={cellSize}
            />
          ))}
        </Board>

        {gameState.completed && (
          <div className="game__win-message">
            <h2 className="game__win-title">Rescue Complete!</h2>
            <div className="game__win-stats">
              Moves: {gameState.moveCount} / {puzzle.optimalMoves}
            </div>
            <div className="game__win-stats">
              Time: {gameState.completionTime}s
            </div>
          </div>
        )}
      </div>

      <div className="game__controls">
        <button className="game__button" onClick={reset}>
          Reset
        </button>
      </div>

      <div className="game__direction-buttons">
        {directions.map((dir) => (
          <button
            key={dir}
            className={`game__direction-button game__direction-button--${dir}`}
            onClick={() => moveShip(dir)}
            disabled={!selectedShip || gameState.completed}
            aria-label={`Move ${dir}`}
          >
            {directionSymbols[dir]}
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Step 4: Create index export**

Create file `client/src/components/Game/index.ts`:

```typescript
export { Game } from './Game';
export { useGame } from './useGame';
```

**Step 5: Commit Game component**

```bash
git add client/src/components/Game/
git commit -m "feat(client): add Game container with controls and win detection"
```

---

## Task 7: Integrate Game into App with Test Puzzle

**Files:**
- Modify: `client/src/App.tsx`

**Step 1: Update App to render Game**

Update `client/src/App.tsx`:

```typescript
import type { Puzzle } from '@slidecraft/shared';
import { Game } from './components/Game';

// Test puzzle for development
const testPuzzle: Puzzle = {
  id: 1,
  date: '2025-01-01',
  ships: [
    { color: 'red', position: { x: 2, y: 2 } },
    { color: 'blue', position: { x: 8, y: 5 } },
    { color: 'green', position: { x: 12, y: 10 } },
    { color: 'yellow', position: { x: 5, y: 14 } },
  ],
  obstacles: [
    { type: 'asteroid', position: { x: 5, y: 2 } },
    { type: 'asteroid', position: { x: 10, y: 8 } },
    { type: 'asteroid', position: { x: 3, y: 12 } },
    { type: 'forceField', position: { x: 7, y: 5 }, edge: 'right' },
    { type: 'forceField', position: { x: 14, y: 2 }, edge: 'down' },
  ],
  astronaut: { x: 14, y: 2 },
  optimalMoves: 3,
};

export default function App() {
  return <Game puzzle={testPuzzle} />;
}
```

**Step 2: Verify game renders and is playable**

Run: `bun run --cwd client dev`
Expected: Game board renders with ships, obstacles, astronaut. Ships can be selected and moved.

**Step 3: Update App test**

Update `client/src/App.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the game title', () => {
    render(<App />);
    expect(screen.getByText(/SlideCraft #1/)).toBeInTheDocument();
  });

  it('shows move count', () => {
    render(<App />);
    expect(screen.getByText(/Moves: 0/)).toBeInTheDocument();
  });

  it('shows optimal moves', () => {
    render(<App />);
    expect(screen.getByText(/Optimal: 3/)).toBeInTheDocument();
  });

  it('renders reset button', () => {
    render(<App />);
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });
});
```

**Step 4: Run tests**

Run: `bun run --cwd client test`
Expected: All tests pass

**Step 5: Commit integration**

```bash
git add client/src/App.tsx client/src/App.test.tsx
git commit -m "feat(client): integrate Game component with test puzzle"
```

---

## Summary

After completing this plan, you will have:

1. Complete ship movement logic with all collision types (asteroids, ships, force fields, board edges)
2. Game state management with win detection
3. 16x16 game board rendering with CSS Grid
4. Ship components with distinct shapes for accessibility
5. Smooth Framer Motion animations for ship movement
6. Keyboard controls (arrow keys, WASD)
7. Touch-friendly direction buttons
8. Reset functionality
9. Win detection and display

The game is now playable locally with a test puzzle. Ready for Plan 3: Discord Integration.
