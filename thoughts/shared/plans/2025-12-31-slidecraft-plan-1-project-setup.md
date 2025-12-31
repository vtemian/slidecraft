# SlideCraft Implementation Plan 1: Project Setup & Core Infrastructure

**Goal:** Establish the monorepo structure with TypeScript, Vite client, Express server, and shared types.

**Architecture:** Monorepo with three packages: `client` (Vite + React), `server` (Express), and `shared` (TypeScript types). All packages use TypeScript with strict mode. The client and server both import from shared.

**Design:** [thoughts/shared/designs/2025-12-31-slidecraft-design.md](../designs/2025-12-31-slidecraft-design.md)

**Prerequisites:** None - this is the first plan.

**Done when:**
- Monorepo structure is in place with all three packages
- Client runs with `bun run dev` and shows a placeholder page
- Server runs with `bun run dev` and responds to health check
- Shared types are importable from both client and server
- All TypeScript compiles without errors

---

## Task 1: Initialize Git Repository and Root Package

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `tsconfig.base.json`

**Step 1: Initialize git repository**

Run: `git init`
Expected: Initialized empty Git repository

**Step 2: Create root package.json with workspaces**

```json
{
  "name": "slidecraft",
  "private": true,
  "workspaces": [
    "client",
    "server",
    "shared"
  ],
  "scripts": {
    "dev": "concurrently \"bun run dev:client\" \"bun run dev:server\"",
    "dev:client": "bun run --cwd client dev",
    "dev:server": "bun run --cwd server dev",
    "build": "bun run build:shared && bun run build:client && bun run build:server",
    "build:shared": "bun run --cwd shared build",
    "build:client": "bun run --cwd client build",
    "build:server": "bun run --cwd server build",
    "test": "bun run test:shared && bun run test:client && bun run test:server",
    "test:shared": "bun run --cwd shared test",
    "test:client": "bun run --cwd client test",
    "test:server": "bun run --cwd server test",
    "typecheck": "tsc --build"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "typescript": "^5.3.3"
  }
}
```

**Step 3: Create base TypeScript configuration**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

**Step 4: Create .gitignore**

```
# Dependencies
node_modules/

# Build outputs
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Test coverage
coverage/

# Bun
bun.lockb
```

**Step 5: Install root dependencies**

Run: `bun install`
Expected: Dependencies installed successfully

**Step 6: Commit initial setup**

```bash
git add package.json tsconfig.base.json .gitignore
git commit -m "chore: initialize monorepo with workspaces"
```

---

## Task 2: Create Shared Types Package

**Files:**
- Create: `shared/package.json`
- Create: `shared/tsconfig.json`
- Create: `shared/src/index.ts`
- Create: `shared/src/types/game.ts`
- Create: `shared/src/types/api.ts`

**Step 1: Create shared package.json**

```json
{
  "name": "@slidecraft/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
```

**Step 2: Create shared tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create game types**

Create file `shared/src/types/game.ts`:

```typescript
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
```

**Step 4: Create API types**

Create file `shared/src/types/api.ts`:

```typescript
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
```

**Step 5: Create shared index export**

Create file `shared/src/index.ts`:

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
```

**Step 6: Verify shared package compiles**

Run: `bun run --cwd shared typecheck`
Expected: No errors

**Step 7: Commit shared package**

```bash
git add shared/
git commit -m "feat(shared): add core game and API types"
```

---

## Task 3: Create Server Package Skeleton

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/index.ts`
- Create: `server/src/routes/health.ts`

**Step 1: Create server package.json**

```json
{
  "name": "@slidecraft/server",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target node",
    "start": "bun dist/index.js",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@slidecraft/shared": "workspace:*",
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "typescript": "^5.3.3"
  }
}
```

**Step 2: Create server tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["bun-types"]
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../shared" }
  ]
}
```

**Step 3: Create health check route**

Create file `server/src/routes/health.ts`:

```typescript
import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
```

**Step 4: Create server entry point**

Create file `server/src/index.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', healthRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
```

**Step 5: Install server dependencies**

Run: `bun install`
Expected: Dependencies installed

**Step 6: Verify server starts**

Run: `bun run --cwd server dev &` then `curl http://localhost:3001/api/health`
Expected: `{"status":"ok","timestamp":"..."}`

**Step 7: Commit server skeleton**

```bash
git add server/
git commit -m "feat(server): add Express server skeleton with health check"
```

---

## Task 4: Create Client Package Skeleton

**Files:**
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/tsconfig.node.json`
- Create: `client/vite.config.ts`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/vite-env.d.ts`

**Step 1: Create client package.json**

```json
{
  "name": "@slidecraft/client",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@slidecraft/shared": "workspace:*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "framer-motion": "^10.18.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.12",
    "vitest": "^1.2.2"
  }
}
```

**Step 2: Create client tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["vite/client"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "../shared" }
  ]
}
```

**Step 3: Create client tsconfig.node.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "lib": ["ES2022"],
    "types": ["node"]
  },
  "include": ["vite.config.ts"]
}
```

**Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

**Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SlideCraft</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #1a1a2e;
        color: #eee;
        min-height: 100vh;
      }
      #root {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 6: Create vite-env.d.ts**

Create file `client/src/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />
```

**Step 7: Create main.tsx**

Create file `client/src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 8: Create App.tsx placeholder**

Create file `client/src/App.tsx`:

```typescript
import type { ShipColor } from '@slidecraft/shared';

// Verify shared types are accessible
const testColor: ShipColor = 'red';

export default function App() {
  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>SlideCraft</h1>
      <p>Daily Sliding Puzzle</p>
      <p style={{ marginTop: '1rem', opacity: 0.7 }}>
        Rescue ship color: {testColor}
      </p>
    </div>
  );
}
```

**Step 9: Install client dependencies**

Run: `bun install`
Expected: Dependencies installed

**Step 10: Verify client starts**

Run: `bun run --cwd client dev`
Expected: Vite dev server starts on http://localhost:3000

**Step 11: Commit client skeleton**

```bash
git add client/
git commit -m "feat(client): add Vite + React client skeleton"
```

---

## Task 5: Add Test Infrastructure

**Files:**
- Create: `shared/src/types/game.test.ts`
- Create: `server/src/routes/health.test.ts`
- Create: `client/src/App.test.tsx`
- Create: `client/vitest.config.ts`

**Step 1: Write failing test for calculateStarRating**

Create file `shared/src/types/game.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import { calculateStarRating } from './game';

describe('calculateStarRating', () => {
  it('returns 5 stars for optimal solution', () => {
    expect(calculateStarRating(5, 5)).toBe(5);
  });

  it('returns 4 stars for optimal + 1', () => {
    expect(calculateStarRating(6, 5)).toBe(4);
  });

  it('returns 3 stars for optimal + 2-3', () => {
    expect(calculateStarRating(7, 5)).toBe(3);
    expect(calculateStarRating(8, 5)).toBe(3);
  });

  it('returns 2 stars for optimal + 4-5', () => {
    expect(calculateStarRating(9, 5)).toBe(2);
    expect(calculateStarRating(10, 5)).toBe(2);
  });

  it('returns 1 star for 6+ over optimal', () => {
    expect(calculateStarRating(11, 5)).toBe(1);
    expect(calculateStarRating(20, 5)).toBe(1);
  });
});
```

**Step 2: Run test to verify it passes**

Run: `bun test shared/src/types/game.test.ts`
Expected: All tests pass (implementation already exists)

**Step 3: Write server health check test**

Create file `server/src/routes/health.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import express from 'express';
import healthRouter from './health';

describe('GET /api/health', () => {
  const app = express();
  app.use('/api', healthRouter);

  it('returns status ok', async () => {
    const response = await app.request('/api/health');
    const body = await response.json();
    
    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });
});
```

**Step 4: Run server test**

Run: `bun test server/src/routes/health.test.ts`
Expected: Test passes

**Step 5: Create vitest config for client**

Create file `client/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Step 6: Add jsdom and testing-library to client**

Update `client/package.json` devDependencies:

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.2.0",
    "jsdom": "^24.0.0",
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.12",
    "vitest": "^1.2.2"
  }
}
```

Run: `bun install`

**Step 7: Write client App test**

Create file `client/src/App.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the title', () => {
    render(<App />);
    expect(screen.getByText('SlideCraft')).toBeInTheDocument();
  });

  it('shows rescue ship color from shared types', () => {
    render(<App />);
    expect(screen.getByText(/rescue ship color: red/i)).toBeInTheDocument();
  });
});
```

**Step 8: Create test setup file**

Create file `client/src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom';
```

Update `client/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Step 9: Run client tests**

Run: `bun run --cwd client test`
Expected: All tests pass

**Step 10: Commit test infrastructure**

```bash
git add .
git commit -m "test: add test infrastructure for all packages"
```

---

## Task 6: Final Verification and Documentation

**Files:**
- Create: `README.md`

**Step 1: Run all tests**

Run: `bun run test`
Expected: All tests pass across all packages

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No TypeScript errors

**Step 3: Verify dev servers work together**

Run: `bun run dev`
Expected: Both client (3000) and server (3001) start, client proxies /api to server

**Step 4: Create README**

```markdown
# SlideCraft

Daily sliding puzzle game - a Discord Activity inspired by Ricochet Robots and Wordle.

## Development

```bash
# Install dependencies
bun install

# Run development servers (client + server)
bun run dev

# Run tests
bun run test

# Type check
bun run typecheck
```

## Project Structure

```
slidecraft/
  client/     # React + Vite frontend
  server/     # Express API backend
  shared/     # Shared TypeScript types
```

## Ports

- Client: http://localhost:3000
- Server: http://localhost:3001
```

**Step 5: Final commit**

```bash
git add README.md
git commit -m "docs: add project README"
```

---

## Summary

After completing this plan, you will have:

1. A working monorepo with three packages (client, server, shared)
2. TypeScript configured with strict mode across all packages
3. Shared types for game state and API contracts
4. A Vite + React client that starts and renders
5. An Express server with a health check endpoint
6. Test infrastructure for all packages
7. Proxy configuration so client can call server APIs

The project is ready for Plan 2: Game Logic & Board.
