# SlideCraft Implementation Plan 4: Server API & Database

**Goal:** Implement PostgreSQL database, puzzle storage, solution submission, and player statistics APIs.

**Architecture:** PostgreSQL database with three tables (puzzles, players, solutions). Express API endpoints for fetching puzzles, submitting solutions, and retrieving stats. Server-side solution validation.

**Design:** [thoughts/shared/designs/2025-12-31-slidecraft-design.md](../designs/2025-12-31-slidecraft-design.md)

**Prerequisites:** Plans 1-3 completed (project setup, game logic, Discord integration)

**Done when:**
- PostgreSQL database schema is created with migrations
- GET /api/puzzle returns today's puzzle
- POST /api/solution validates and records solutions
- GET /api/stats returns player statistics
- Client fetches puzzle from API instead of hardcoded data

---

## Task 1: Set Up PostgreSQL Connection

**Files:**
- Modify: `server/package.json`
- Create: `server/src/db/connection.ts`
- Create: `server/src/db/index.ts`
- Modify: `server/.env.example`

**Step 1: Install PostgreSQL client**

Add to `server/package.json` dependencies:

```json
{
  "dependencies": {
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "@types/pg": "^8.10.9"
  }
}
```

Run: `bun install`
Expected: Package installed

**Step 2: Update environment example**

Update `server/.env.example`:

```
# Discord Application Credentials
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here

# Database
DATABASE_URL=postgresql://localhost:5432/slidecraft

# Server Configuration
PORT=3001
NODE_ENV=development
```

**Step 3: Create database connection**

Create file `server/src/db/connection.ts`:

```typescript
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/slidecraft';

export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

/**
 * Execute a query with parameters.
 */
export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

/**
 * Execute a query and return the first row.
 */
export async function queryOne<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Close the connection pool.
 */
export async function closePool(): Promise<void> {
  await pool.end();
}
```

**Step 4: Create db index export**

Create file `server/src/db/index.ts`:

```typescript
export { pool, query, queryOne, closePool } from './connection.js';
```

**Step 5: Commit database connection**

```bash
git add server/
git commit -m "feat(server): add PostgreSQL connection pool"
```

---

## Task 2: Create Database Schema and Migrations

**Files:**
- Create: `server/src/db/migrations/001_initial_schema.sql`
- Create: `server/src/db/migrate.ts`
- Modify: `server/package.json`

**Step 1: Create initial schema migration**

Create file `server/src/db/migrations/001_initial_schema.sql`:

```sql
-- Puzzles table
CREATE TABLE IF NOT EXISTS puzzles (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  board_layout JSONB NOT NULL,
  optimal_moves INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  discord_user_id VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255),
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Solutions table
CREATE TABLE IF NOT EXISTS solutions (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
  puzzle_id INTEGER REFERENCES puzzles(id) ON DELETE CASCADE,
  moves JSONB NOT NULL,
  move_count INTEGER NOT NULL,
  time_seconds INTEGER NOT NULL,
  solved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, puzzle_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_puzzles_date ON puzzles(date);
CREATE INDEX IF NOT EXISTS idx_players_discord_id ON players(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_solutions_player ON solutions(player_id);
CREATE INDEX IF NOT EXISTS idx_solutions_puzzle ON solutions(puzzle_id);

-- Migrations tracking table
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Step 2: Create migration runner**

Create file `server/src/db/migrate.ts`:

```typescript
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { pool, query, queryOne } from './connection.js';

interface Migration {
  id: number;
  name: string;
  applied_at: Date;
}

const MIGRATIONS_DIR = path.join(import.meta.dir, 'migrations');

/**
 * Run all pending migrations.
 */
export async function runMigrations(): Promise<void> {
  console.log('Running database migrations...');

  // Ensure migrations table exists
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Get list of migration files
  const files = await readdir(MIGRATIONS_DIR);
  const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();

  for (const file of sqlFiles) {
    // Check if migration already applied
    const existing = await queryOne<Migration>(
      'SELECT * FROM migrations WHERE name = $1',
      [file]
    );

    if (existing) {
      console.log(`  Skipping ${file} (already applied)`);
      continue;
    }

    // Read and execute migration
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = await readFile(filePath, 'utf-8');

    console.log(`  Applying ${file}...`);
    await query(sql);

    // Record migration
    await query('INSERT INTO migrations (name) VALUES ($1)', [file]);
    console.log(`  Applied ${file}`);
  }

  console.log('Migrations complete');
}

// Run migrations if executed directly
if (import.meta.main) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
```

**Step 3: Add migration script to package.json**

Update `server/package.json` scripts:

```json
{
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target node",
    "start": "bun dist/index.js",
    "test": "bun test",
    "typecheck": "tsc --noEmit",
    "db:migrate": "bun src/db/migrate.ts"
  }
}
```

**Step 4: Commit migrations**

```bash
git add server/
git commit -m "feat(server): add database schema and migration runner"
```

---

## Task 3: Create Puzzle Repository

**Files:**
- Create: `server/src/repositories/puzzleRepository.ts`
- Create: `server/src/repositories/puzzleRepository.test.ts`
- Create: `server/src/repositories/index.ts`

**Step 1: Write failing test for puzzle repository**

Create file `server/src/repositories/puzzleRepository.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `bun test server/src/repositories/puzzleRepository.test.ts`
Expected: FAIL - module not found

**Step 3: Implement puzzle repository**

Create file `server/src/repositories/puzzleRepository.ts`:

```typescript
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
```

**Step 4: Create index export**

Create file `server/src/repositories/index.ts`:

```typescript
export {
  getPuzzleByDate,
  getTodaysPuzzle,
  createPuzzle,
  getPuzzleById,
  getAllPuzzles,
} from './puzzleRepository.js';
```

**Step 5: Run tests (requires test database)**

Run: `createdb slidecraft_test && bun test server/src/repositories/puzzleRepository.test.ts`
Expected: All tests pass

**Step 6: Commit puzzle repository**

```bash
git add server/src/repositories/
git commit -m "feat(server): add puzzle repository with database operations"
```

---

## Task 4: Create Player Repository

**Files:**
- Create: `server/src/repositories/playerRepository.ts`
- Create: `server/src/repositories/playerRepository.test.ts`
- Modify: `server/src/repositories/index.ts`

**Step 1: Write failing test for player repository**

Create file `server/src/repositories/playerRepository.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { pool } from '../db/connection';
import { runMigrations } from '../db/migrate';
import {
  getOrCreatePlayer,
  getPlayerByDiscordId,
  updatePlayerStats,
} from './playerRepository';

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/slidecraft_test';

describe('playerRepository', () => {
  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM solutions');
    await pool.query('DELETE FROM players');
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('getOrCreatePlayer', () => {
    it('creates new player if not exists', async () => {
      const player = await getOrCreatePlayer('discord-123', 'TestUser');

      expect(player.discordUserId).toBe('discord-123');
      expect(player.gamesPlayed).toBe(0);
      expect(player.currentStreak).toBe(0);
    });

    it('returns existing player if exists', async () => {
      await getOrCreatePlayer('discord-456', 'User1');
      const player = await getOrCreatePlayer('discord-456', 'User1Updated');

      expect(player.discordUserId).toBe('discord-456');
    });
  });

  describe('updatePlayerStats', () => {
    it('increments games played and won', async () => {
      const player = await getOrCreatePlayer('discord-789', 'Winner');
      const updated = await updatePlayerStats(player.discordUserId, true);

      expect(updated.gamesPlayed).toBe(1);
      expect(updated.gamesWon).toBe(1);
      expect(updated.currentStreak).toBe(1);
      expect(updated.maxStreak).toBe(1);
    });

    it('resets streak on loss', async () => {
      const player = await getOrCreatePlayer('discord-streak', 'Streaker');
      await updatePlayerStats(player.discordUserId, true);
      await updatePlayerStats(player.discordUserId, true);
      const updated = await updatePlayerStats(player.discordUserId, false);

      expect(updated.gamesPlayed).toBe(3);
      expect(updated.gamesWon).toBe(2);
      expect(updated.currentStreak).toBe(0);
      expect(updated.maxStreak).toBe(2);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test server/src/repositories/playerRepository.test.ts`
Expected: FAIL - module not found

**Step 3: Implement player repository**

Create file `server/src/repositories/playerRepository.ts`:

```typescript
import { query, queryOne } from '../db/connection.js';
import type { PlayerStats } from '@slidecraft/shared';

interface PlayerRow {
  id: number;
  discord_user_id: string;
  username: string | null;
  games_played: number;
  games_won: number;
  current_streak: number;
  max_streak: number;
}

/**
 * Convert database row to PlayerStats type.
 */
function rowToPlayerStats(row: PlayerRow): PlayerStats {
  return {
    discordUserId: row.discord_user_id,
    gamesPlayed: row.games_played,
    gamesWon: row.games_won,
    currentStreak: row.current_streak,
    maxStreak: row.max_streak,
    averageMoves: 0, // Calculated separately
    averageTime: 0, // Calculated separately
  };
}

/**
 * Get player by Discord user ID.
 */
export async function getPlayerByDiscordId(
  discordUserId: string
): Promise<PlayerStats | null> {
  const row = await queryOne<PlayerRow>(
    'SELECT * FROM players WHERE discord_user_id = $1',
    [discordUserId]
  );

  return row ? rowToPlayerStats(row) : null;
}

/**
 * Get or create a player by Discord user ID.
 */
export async function getOrCreatePlayer(
  discordUserId: string,
  username?: string
): Promise<PlayerStats> {
  // Try to get existing player
  const existing = await getPlayerByDiscordId(discordUserId);
  if (existing) return existing;

  // Create new player
  const rows = await query<PlayerRow>(
    `INSERT INTO players (discord_user_id, username)
     VALUES ($1, $2)
     ON CONFLICT (discord_user_id) DO UPDATE SET username = EXCLUDED.username
     RETURNING *`,
    [discordUserId, username ?? null]
  );

  return rowToPlayerStats(rows[0]);
}

/**
 * Update player statistics after a game.
 */
export async function updatePlayerStats(
  discordUserId: string,
  won: boolean
): Promise<PlayerStats> {
  const rows = await query<PlayerRow>(
    `UPDATE players SET
       games_played = games_played + 1,
       games_won = games_won + $2,
       current_streak = CASE WHEN $3 THEN current_streak + 1 ELSE 0 END,
       max_streak = GREATEST(max_streak, CASE WHEN $3 THEN current_streak + 1 ELSE 0 END),
       updated_at = NOW()
     WHERE discord_user_id = $1
     RETURNING *`,
    [discordUserId, won ? 1 : 0, won]
  );

  return rowToPlayerStats(rows[0]);
}

/**
 * Get player's internal database ID.
 */
export async function getPlayerDbId(discordUserId: string): Promise<number | null> {
  const row = await queryOne<{ id: number }>(
    'SELECT id FROM players WHERE discord_user_id = $1',
    [discordUserId]
  );

  return row?.id ?? null;
}
```

**Step 4: Update index export**

Update `server/src/repositories/index.ts`:

```typescript
export {
  getPuzzleByDate,
  getTodaysPuzzle,
  createPuzzle,
  getPuzzleById,
  getAllPuzzles,
} from './puzzleRepository.js';

export {
  getPlayerByDiscordId,
  getOrCreatePlayer,
  updatePlayerStats,
  getPlayerDbId,
} from './playerRepository.js';
```

**Step 5: Run tests**

Run: `bun test server/src/repositories/playerRepository.test.ts`
Expected: All tests pass

**Step 6: Commit player repository**

```bash
git add server/src/repositories/
git commit -m "feat(server): add player repository with stats tracking"
```

---

## Task 5: Create Solution Repository with Validation

**Files:**
- Create: `server/src/repositories/solutionRepository.ts`
- Create: `server/src/repositories/solutionRepository.test.ts`
- Modify: `server/src/repositories/index.ts`

**Step 1: Write failing test for solution repository**

Create file `server/src/repositories/solutionRepository.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `bun test server/src/repositories/solutionRepository.test.ts`
Expected: FAIL - module not found

**Step 3: Implement solution repository**

Create file `server/src/repositories/solutionRepository.ts`:

```typescript
import { query, queryOne } from '../db/connection.js';
import { getPlayerDbId, updatePlayerStats, getPlayerByDiscordId } from './playerRepository.js';
import { getPuzzleById } from './puzzleRepository.js';
import { calculateStarRating } from '@slidecraft/shared';
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
```

**Step 4: Update index export**

Update `server/src/repositories/index.ts`:

```typescript
export {
  getPuzzleByDate,
  getTodaysPuzzle,
  createPuzzle,
  getPuzzleById,
  getAllPuzzles,
} from './puzzleRepository.js';

export {
  getPlayerByDiscordId,
  getOrCreatePlayer,
  updatePlayerStats,
  getPlayerDbId,
} from './playerRepository.js';

export {
  hasPlayerSolvedPuzzle,
  getSolutionForPlayer,
  submitSolution,
  getPlayerAverages,
} from './solutionRepository.js';
```

**Step 5: Run tests**

Run: `bun test server/src/repositories/solutionRepository.test.ts`
Expected: All tests pass

**Step 6: Commit solution repository**

```bash
git add server/src/repositories/
git commit -m "feat(server): add solution repository with validation"
```

---

## Task 6: Create API Routes

**Files:**
- Create: `server/src/routes/puzzle.ts`
- Create: `server/src/routes/solution.ts`
- Create: `server/src/routes/stats.ts`
- Modify: `server/src/index.ts`

**Step 1: Create puzzle route**

Create file `server/src/routes/puzzle.ts`:

```typescript
import { Router } from 'express';
import { getTodaysPuzzle, getPuzzleByDate } from '../repositories/index.js';
import type { PuzzleResponse, ApiError } from '@slidecraft/shared';

const router = Router();

/**
 * GET /api/puzzle
 * Returns today's puzzle.
 */
router.get('/', async (_req, res) => {
  try {
    const puzzle = await getTodaysPuzzle();

    if (!puzzle) {
      const error: ApiError = {
        error: 'No puzzle available',
        message: 'No puzzle is available for today',
      };
      return res.status(404).json(error);
    }

    const response: PuzzleResponse = { puzzle };
    res.json(response);
  } catch (error) {
    console.error('Error fetching puzzle:', error);
    const apiError: ApiError = {
      error: 'Server error',
      message: 'Failed to fetch puzzle',
    };
    res.status(500).json(apiError);
  }
});

/**
 * GET /api/puzzle/:date
 * Returns puzzle for a specific date (YYYY-MM-DD).
 */
router.get('/:date', async (req, res) => {
  try {
    const { date } = req.params;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const error: ApiError = {
        error: 'Invalid date format',
        message: 'Date must be in YYYY-MM-DD format',
      };
      return res.status(400).json(error);
    }

    const puzzle = await getPuzzleByDate(date);

    if (!puzzle) {
      const error: ApiError = {
        error: 'Puzzle not found',
        message: `No puzzle found for date ${date}`,
      };
      return res.status(404).json(error);
    }

    const response: PuzzleResponse = { puzzle };
    res.json(response);
  } catch (error) {
    console.error('Error fetching puzzle:', error);
    const apiError: ApiError = {
      error: 'Server error',
      message: 'Failed to fetch puzzle',
    };
    res.status(500).json(apiError);
  }
});

export default router;
```

**Step 2: Create solution route**

Create file `server/src/routes/solution.ts`:

```typescript
import { Router } from 'express';
import { submitSolution, getOrCreatePlayer } from '../repositories/index.js';
import type { SolutionRequest, SolutionResponse, ApiError } from '@slidecraft/shared';

const router = Router();

/**
 * POST /api/solution
 * Submit a solution for a puzzle.
 * Requires authentication (Discord user ID in header).
 */
router.post('/', async (req, res) => {
  try {
    // Get Discord user ID from header (set by auth middleware)
    const discordUserId = req.headers['x-discord-user-id'] as string;

    if (!discordUserId) {
      const error: ApiError = {
        error: 'Unauthorized',
        message: 'Discord user ID is required',
      };
      return res.status(401).json(error);
    }

    const { solution } = req.body as SolutionRequest;

    if (!solution || !solution.puzzleId || !solution.moves) {
      const error: ApiError = {
        error: 'Invalid request',
        message: 'Solution must include puzzleId and moves',
      };
      return res.status(400).json(error);
    }

    // Ensure player exists
    await getOrCreatePlayer(discordUserId);

    // Submit solution
    const result = await submitSolution(
      discordUserId,
      solution.puzzleId,
      solution.moves,
      solution.timeSeconds
    );

    res.json(result);
  } catch (error) {
    console.error('Error submitting solution:', error);
    const apiError: ApiError = {
      error: 'Server error',
      message: 'Failed to submit solution',
    };
    res.status(500).json(apiError);
  }
});

export default router;
```

**Step 3: Create stats route**

Create file `server/src/routes/stats.ts`:

```typescript
import { Router } from 'express';
import { getOrCreatePlayer, getPlayerAverages } from '../repositories/index.js';
import type { StatsResponse, ApiError, PlayerStats } from '@slidecraft/shared';

const router = Router();

/**
 * GET /api/stats
 * Returns player statistics.
 * Requires authentication (Discord user ID in header).
 */
router.get('/', async (req, res) => {
  try {
    const discordUserId = req.headers['x-discord-user-id'] as string;

    if (!discordUserId) {
      const error: ApiError = {
        error: 'Unauthorized',
        message: 'Discord user ID is required',
      };
      return res.status(401).json(error);
    }

    // Get or create player
    const player = await getOrCreatePlayer(discordUserId);

    // Get averages
    const averages = await getPlayerAverages(discordUserId);

    const stats: PlayerStats = {
      ...player,
      averageMoves: averages.averageMoves,
      averageTime: averages.averageTime,
    };

    const response: StatsResponse = { stats };
    res.json(response);
  } catch (error) {
    console.error('Error fetching stats:', error);
    const apiError: ApiError = {
      error: 'Server error',
      message: 'Failed to fetch stats',
    };
    res.status(500).json(apiError);
  }
});

export default router;
```

**Step 4: Update server to use new routes**

Update `server/src/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import path from 'path';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import puzzleRouter from './routes/puzzle.js';
import solutionRouter from './routes/solution.js';
import statsRouter from './routes/stats.js';
import { runMigrations } from './db/migrate.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Discord Activity URL mapping
app.use('/.proxy', (req, _res, next) => {
  req.url = req.originalUrl.replace(/^\/.proxy/, '');
  next('route');
});

// Routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/puzzle', puzzleRouter);
app.use('/api/solution', solutionRouter);
app.use('/api/stats', statsRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(process.cwd(), '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Initialize database and start server
async function start() {
  try {
    // Run migrations
    await runMigrations();

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
```

**Step 5: Commit API routes**

```bash
git add server/src/routes/ server/src/index.ts
git commit -m "feat(server): add puzzle, solution, and stats API routes"
```

---

## Task 7: Create Seed Script for Test Puzzle

**Files:**
- Create: `server/src/db/seed.ts`
- Modify: `server/package.json`

**Step 1: Create seed script**

Create file `server/src/db/seed.ts`:

```typescript
import { createPuzzle, getPuzzleByDate } from '../repositories/puzzleRepository.js';
import { closePool } from './connection.js';
import { runMigrations } from './migrate.js';

/**
 * Seed the database with a puzzle for today.
 */
async function seed() {
  console.log('Seeding database...');

  // Run migrations first
  await runMigrations();

  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  // Check if puzzle already exists
  const existing = await getPuzzleByDate(today);
  if (existing) {
    console.log(`Puzzle for ${today} already exists (ID: ${existing.id})`);
    await closePool();
    return;
  }

  // Create today's puzzle
  const puzzle = await createPuzzle({
    date: today,
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
  });

  console.log(`Created puzzle for ${today} (ID: ${puzzle.id})`);
  await closePool();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
```

**Step 2: Add seed script to package.json**

Update `server/package.json` scripts:

```json
{
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target node",
    "start": "bun dist/index.js",
    "test": "bun test",
    "typecheck": "tsc --noEmit",
    "db:migrate": "bun src/db/migrate.ts",
    "db:seed": "bun src/db/seed.ts"
  }
}
```

**Step 3: Commit seed script**

```bash
git add server/src/db/seed.ts server/package.json
git commit -m "feat(server): add database seed script for test puzzle"
```

---

## Task 8: Update Client to Fetch Puzzle from API

**Files:**
- Create: `client/src/api/client.ts`
- Create: `client/src/api/index.ts`
- Modify: `client/src/App.tsx`

**Step 1: Create API client**

Create file `client/src/api/client.ts`:

```typescript
import type {
  PuzzleResponse,
  SolutionRequest,
  SolutionResponse,
  StatsResponse,
  ApiError,
} from '@slidecraft/shared';

const API_BASE = '/api';

class ApiClient {
  private discordUserId: string | null = null;

  setDiscordUserId(userId: string) {
    this.discordUserId = userId;
  }

  private async fetch<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.discordUserId) {
      headers['x-discord-user-id'] = this.discordUserId;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  async getTodaysPuzzle(): Promise<PuzzleResponse> {
    return this.fetch<PuzzleResponse>('/puzzle');
  }

  async getPuzzleByDate(date: string): Promise<PuzzleResponse> {
    return this.fetch<PuzzleResponse>(`/puzzle/${date}`);
  }

  async submitSolution(solution: SolutionRequest['solution']): Promise<SolutionResponse> {
    return this.fetch<SolutionResponse>('/solution', {
      method: 'POST',
      body: JSON.stringify({ solution }),
    });
  }

  async getStats(): Promise<StatsResponse> {
    return this.fetch<StatsResponse>('/stats');
  }
}

export const apiClient = new ApiClient();
```

**Step 2: Create API index export**

Create file `client/src/api/index.ts`:

```typescript
export { apiClient } from './client';
```

**Step 3: Update App to fetch puzzle from API**

Update `client/src/App.tsx`:

```typescript
import { useEffect, useState } from 'react';
import type { Puzzle } from '@slidecraft/shared';
import { useDiscord } from './discord';
import { apiClient } from './api';
import { Game } from './components/Game';
import { LoadingScreen } from './components/LoadingScreen';

export default function App() {
  const { auth, isReady } = useDiscord();
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set Discord user ID for API calls
  useEffect(() => {
    if (auth.user) {
      apiClient.setDiscordUserId(auth.user.id);
    }
  }, [auth.user]);

  // Fetch today's puzzle
  useEffect(() => {
    if (!isReady || !auth.isAuthenticated) return;

    async function fetchPuzzle() {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getTodaysPuzzle();
        setPuzzle(response.puzzle);
      } catch (err) {
        console.error('Failed to fetch puzzle:', err);
        setError(err instanceof Error ? err.message : 'Failed to load puzzle');
      } finally {
        setLoading(false);
      }
    }

    fetchPuzzle();
  }, [isReady, auth.isAuthenticated]);

  if (!isReady) {
    return <LoadingScreen message="Connecting to Discord..." />;
  }

  if (auth.error) {
    return (
      <LoadingScreen
        error={auth.error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (loading) {
    return <LoadingScreen message="Loading today's puzzle..." />;
  }

  if (error || !puzzle) {
    return (
      <LoadingScreen
        error={error || 'No puzzle available'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div>
      {auth.user && (
        <div style={{ padding: '0.5rem', textAlign: 'right', opacity: 0.7 }}>
          Playing as {auth.user.username}
        </div>
      )}
      <Game puzzle={puzzle} />
    </div>
  );
}
```

**Step 4: Update App test**

Update `client/src/App.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DiscordProvider } from './discord';
import App from './App';

// Mock the API client
vi.mock('./api', () => ({
  apiClient: {
    setDiscordUserId: vi.fn(),
    getTodaysPuzzle: vi.fn().mockResolvedValue({
      puzzle: {
        id: 1,
        date: '2025-01-01',
        ships: [
          { color: 'red', position: { x: 2, y: 2 } },
          { color: 'blue', position: { x: 8, y: 5 } },
          { color: 'green', position: { x: 12, y: 10 } },
          { color: 'yellow', position: { x: 5, y: 14 } },
        ],
        obstacles: [],
        astronaut: { x: 14, y: 2 },
        optimalMoves: 3,
      },
    }),
  },
}));

const renderWithDiscord = (component: React.ReactElement) => {
  return render(
    <DiscordProvider skipInit>
      {component}
    </DiscordProvider>
  );
};

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the game after loading puzzle', async () => {
    renderWithDiscord(<App />);

    await waitFor(() => {
      expect(screen.getByText(/SlideCraft #1/)).toBeInTheDocument();
    });
  });

  it('shows username when authenticated', async () => {
    renderWithDiscord(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Playing as DevUser/)).toBeInTheDocument();
    });
  });
});
```

**Step 5: Run tests**

Run: `bun run --cwd client test`
Expected: All tests pass

**Step 6: Commit client API integration**

```bash
git add client/src/
git commit -m "feat(client): fetch puzzle from API instead of hardcoded data"
```

---

## Summary

After completing this plan, you will have:

1. PostgreSQL database with schema for puzzles, players, and solutions
2. Migration system for database schema changes
3. Repositories for all database operations
4. API endpoints:
   - GET /api/puzzle - Today's puzzle
   - GET /api/puzzle/:date - Puzzle by date
   - POST /api/solution - Submit solution
   - GET /api/stats - Player statistics
5. Solution validation and star rating calculation
6. Player statistics tracking (games, wins, streaks)
7. Seed script for creating test puzzles
8. Client API client for all endpoints
9. Client fetches puzzle from server instead of hardcoded data

The game now has a complete backend. Ready for Plan 5: Polish & Completion.
