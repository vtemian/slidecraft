# SlideCraft Implementation Plan 5: Polish & Completion

**Goal:** Add results screen, sharing functionality, timer display, celebration animations, and final polish to complete the game.

**Architecture:** Results screen as a modal component with stats and share button. Timer as a standalone component. Celebration animation using Framer Motion. Share format copies to clipboard.

**Design:** [thoughts/shared/designs/2025-12-31-slidecraft-design.md](../designs/2025-12-31-slidecraft-design.md)

**Prerequisites:** Plans 1-4 completed (project setup, game logic, Discord integration, server/database)

**Done when:**
- Timer displays elapsed time during gameplay
- Results screen shows after winning with stats and star rating
- Share button copies formatted result to clipboard
- Celebration animation plays on win
- Solution is submitted to server on completion
- Player stats are displayed and updated

---

## Task 1: Create Timer Component

**Files:**
- Create: `client/src/components/Timer/Timer.tsx`
- Create: `client/src/components/Timer/Timer.css`
- Create: `client/src/components/Timer/index.ts`
- Create: `client/src/components/Timer/useTimer.ts`

**Step 1: Create useTimer hook**

Create file `client/src/components/Timer/useTimer.ts`:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTimerOptions {
  startTime: number;
  running: boolean;
}

export function useTimer({ startTime, running }: UseTimerOptions) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      // Update immediately
      setElapsed(Math.floor((Date.now() - startTime) / 1000));

      // Then update every second
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startTime, running]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    elapsed,
    formatted: formatTime(elapsed),
  };
}
```

**Step 2: Create Timer CSS**

Create file `client/src/components/Timer/Timer.css`:

```css
.timer {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 1.2rem;
  font-weight: 600;
  color: #ffd700;
  background: rgba(255, 215, 0, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  min-width: 4rem;
  text-align: center;
}

.timer--stopped {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
}
```

**Step 3: Create Timer component**

Create file `client/src/components/Timer/Timer.tsx`:

```typescript
import { useTimer } from './useTimer';
import './Timer.css';

interface TimerProps {
  startTime: number;
  running: boolean;
  finalTime?: number;
}

export function Timer({ startTime, running, finalTime }: TimerProps) {
  const { formatted } = useTimer({ startTime, running });

  // If we have a final time, display that instead
  const displayTime = finalTime !== undefined
    ? formatSeconds(finalTime)
    : formatted;

  return (
    <div className={`timer ${!running ? 'timer--stopped' : ''}`}>
      {displayTime}
    </div>
  );
}

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

**Step 4: Create index export**

Create file `client/src/components/Timer/index.ts`:

```typescript
export { Timer } from './Timer';
export { useTimer } from './useTimer';
```

**Step 5: Commit Timer component**

```bash
git add client/src/components/Timer/
git commit -m "feat(client): add Timer component with elapsed time display"
```

---

## Task 2: Create Star Rating Component

**Files:**
- Create: `client/src/components/StarRating/StarRating.tsx`
- Create: `client/src/components/StarRating/StarRating.css`
- Create: `client/src/components/StarRating/index.ts`

**Step 1: Create StarRating CSS**

Create file `client/src/components/StarRating/StarRating.css`:

```css
.star-rating {
  display: flex;
  gap: 0.25rem;
}

.star-rating__star {
  font-size: 1.5rem;
  transition: transform 0.3s ease;
}

.star-rating__star--filled {
  color: #ffd700;
}

.star-rating__star--empty {
  color: #4a4a6a;
}

.star-rating--animated .star-rating__star--filled {
  animation: starPop 0.4s ease forwards;
}

.star-rating--animated .star-rating__star:nth-child(1) { animation-delay: 0.1s; }
.star-rating--animated .star-rating__star:nth-child(2) { animation-delay: 0.2s; }
.star-rating--animated .star-rating__star:nth-child(3) { animation-delay: 0.3s; }
.star-rating--animated .star-rating__star:nth-child(4) { animation-delay: 0.4s; }
.star-rating--animated .star-rating__star:nth-child(5) { animation-delay: 0.5s; }

@keyframes starPop {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); opacity: 1; }
}
```

**Step 2: Create StarRating component**

Create file `client/src/components/StarRating/StarRating.tsx`:

```typescript
import type { StarRating as StarRatingType } from '@slidecraft/shared';
import './StarRating.css';

interface StarRatingProps {
  rating: StarRatingType;
  animated?: boolean;
}

export function StarRating({ rating, animated = false }: StarRatingProps) {
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    const filled = i <= rating;
    stars.push(
      <span
        key={i}
        className={`star-rating__star ${filled ? 'star-rating__star--filled' : 'star-rating__star--empty'}`}
        role="img"
        aria-label={filled ? 'filled star' : 'empty star'}
      >
        ★
      </span>
    );
  }

  return (
    <div
      className={`star-rating ${animated ? 'star-rating--animated' : ''}`}
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {stars}
    </div>
  );
}
```

**Step 3: Create index export**

Create file `client/src/components/StarRating/index.ts`:

```typescript
export { StarRating } from './StarRating';
```

**Step 4: Commit StarRating component**

```bash
git add client/src/components/StarRating/
git commit -m "feat(client): add StarRating component with animation"
```

---

## Task 3: Create Results Screen Component

**Files:**
- Create: `client/src/components/ResultsScreen/ResultsScreen.tsx`
- Create: `client/src/components/ResultsScreen/ResultsScreen.css`
- Create: `client/src/components/ResultsScreen/index.ts`

**Step 1: Create ResultsScreen CSS**

Create file `client/src/components/ResultsScreen/ResultsScreen.css`:

```css
.results-screen {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
  z-index: 1000;
  padding: 1rem;
}

.results-screen__content {
  background: #1a1a2e;
  border: 2px solid #4a4a6a;
  border-radius: 12px;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
}

.results-screen__title {
  font-size: 1.8rem;
  color: #ffd700;
  margin-bottom: 0.5rem;
}

.results-screen__puzzle-number {
  font-size: 1rem;
  opacity: 0.7;
  margin-bottom: 1.5rem;
}

.results-screen__stars {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.results-screen__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.results-screen__stat {
  background: rgba(255, 255, 255, 0.05);
  padding: 0.75rem;
  border-radius: 8px;
}

.results-screen__stat-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  opacity: 0.6;
  margin-bottom: 0.25rem;
}

.results-screen__stat-value {
  font-size: 1.25rem;
  font-weight: 600;
}

.results-screen__stat-value--highlight {
  color: #ffd700;
}

.results-screen__player-stats {
  border-top: 1px solid #4a4a6a;
  padding-top: 1rem;
  margin-bottom: 1.5rem;
}

.results-screen__player-stats-title {
  font-size: 0.9rem;
  opacity: 0.7;
  margin-bottom: 0.75rem;
}

.results-screen__player-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  font-size: 0.85rem;
}

.results-screen__player-stat {
  text-align: center;
}

.results-screen__player-stat-value {
  font-size: 1.1rem;
  font-weight: 600;
}

.results-screen__player-stat-label {
  font-size: 0.65rem;
  opacity: 0.6;
  text-transform: uppercase;
}

.results-screen__actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.results-screen__button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
}

.results-screen__button:hover {
  transform: scale(1.05);
}

.results-screen__button--primary {
  background: #ffd700;
  color: #1a1a2e;
}

.results-screen__button--primary:hover {
  background: #ffed4a;
}

.results-screen__button--secondary {
  background: #4a4a6a;
  color: white;
}

.results-screen__button--secondary:hover {
  background: #5a5a7a;
}

.results-screen__share-feedback {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #4ade80;
  opacity: 0;
  transition: opacity 0.3s;
}

.results-screen__share-feedback--visible {
  opacity: 1;
}
```

**Step 2: Create ResultsScreen component**

Create file `client/src/components/ResultsScreen/ResultsScreen.tsx`:

```typescript
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Puzzle, StarRating as StarRatingType, PlayerStats } from '@slidecraft/shared';
import { StarRating } from '../StarRating';
import './ResultsScreen.css';

interface ResultsScreenProps {
  puzzle: Puzzle;
  moveCount: number;
  timeSeconds: number;
  starRating: StarRatingType;
  stats: PlayerStats | null;
  onClose: () => void;
}

export function ResultsScreen({
  puzzle,
  moveCount,
  timeSeconds,
  starRating,
  stats,
  onClose,
}: ResultsScreenProps) {
  const [copied, setCopied] = useState(false);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generateShareText = (): string => {
    const stars = '★'.repeat(starRating) + '☆'.repeat(5 - starRating);
    return `SlideCraft #${puzzle.id}
${stars}
Moves: ${moveCount}/${puzzle.optimalMoves}
Time: ${formatTime(timeSeconds)}`;
  };

  const handleShare = async () => {
    const text = generateShareText();

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="results-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="results-screen__content"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 25 }}
        >
          <h2 className="results-screen__title">Rescue Complete!</h2>
          <p className="results-screen__puzzle-number">SlideCraft #{puzzle.id}</p>

          <div className="results-screen__stars">
            <StarRating rating={starRating} animated />
          </div>

          <div className="results-screen__stats">
            <div className="results-screen__stat">
              <div className="results-screen__stat-label">Moves</div>
              <div className="results-screen__stat-value">
                {moveCount}
                <span style={{ opacity: 0.5 }}> / {puzzle.optimalMoves}</span>
              </div>
            </div>
            <div className="results-screen__stat">
              <div className="results-screen__stat-label">Time</div>
              <div className="results-screen__stat-value results-screen__stat-value--highlight">
                {formatTime(timeSeconds)}
              </div>
            </div>
          </div>

          {stats && (
            <div className="results-screen__player-stats">
              <div className="results-screen__player-stats-title">Your Stats</div>
              <div className="results-screen__player-stats-grid">
                <div className="results-screen__player-stat">
                  <div className="results-screen__player-stat-value">{stats.gamesPlayed}</div>
                  <div className="results-screen__player-stat-label">Played</div>
                </div>
                <div className="results-screen__player-stat">
                  <div className="results-screen__player-stat-value">
                    {stats.gamesPlayed > 0
                      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
                      : 0}%
                  </div>
                  <div className="results-screen__player-stat-label">Win %</div>
                </div>
                <div className="results-screen__player-stat">
                  <div className="results-screen__player-stat-value">{stats.currentStreak}</div>
                  <div className="results-screen__player-stat-label">Streak</div>
                </div>
                <div className="results-screen__player-stat">
                  <div className="results-screen__player-stat-value">{stats.maxStreak}</div>
                  <div className="results-screen__player-stat-label">Max</div>
                </div>
              </div>
            </div>
          )}

          <div className="results-screen__actions">
            <button
              className="results-screen__button results-screen__button--primary"
              onClick={handleShare}
            >
              Share
            </button>
            <button
              className="results-screen__button results-screen__button--secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>

          <div
            className={`results-screen__share-feedback ${copied ? 'results-screen__share-feedback--visible' : ''}`}
          >
            Copied to clipboard!
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

**Step 3: Create index export**

Create file `client/src/components/ResultsScreen/index.ts`:

```typescript
export { ResultsScreen } from './ResultsScreen';
```

**Step 4: Commit ResultsScreen component**

```bash
git add client/src/components/ResultsScreen/
git commit -m "feat(client): add ResultsScreen with stats and share functionality"
```

---

## Task 4: Create Celebration Animation

**Files:**
- Create: `client/src/components/Celebration/Celebration.tsx`
- Create: `client/src/components/Celebration/Celebration.css`
- Create: `client/src/components/Celebration/index.ts`

**Step 1: Create Celebration CSS**

Create file `client/src/components/Celebration/Celebration.css`:

```css
.celebration {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 999;
  overflow: hidden;
}

.celebration__particle {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
```

**Step 2: Create Celebration component**

Create file `client/src/components/Celebration/Celebration.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Celebration.css';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
}

interface CelebrationProps {
  active: boolean;
  onComplete?: () => void;
}

const COLORS = ['#ffd700', '#ff4444', '#4444ff', '#44ff44', '#ff44ff', '#44ffff'];
const PARTICLE_COUNT = 50;

export function Celebration({ active, onComplete }: CelebrationProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (active) {
      // Generate particles
      const newParticles: Particle[] = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * window.innerWidth,
          y: -20,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 8 + Math.random() * 12,
          rotation: Math.random() * 360,
        });
      }
      setParticles(newParticles);

      // Clear after animation
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

  return (
    <div className="celebration">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="celebration__particle"
            style={{
              backgroundColor: particle.color,
              width: particle.size,
              height: particle.size,
              left: particle.x,
              top: particle.y,
            }}
            initial={{
              y: -20,
              opacity: 1,
              rotate: 0,
            }}
            animate={{
              y: window.innerHeight + 20,
              opacity: [1, 1, 0],
              rotate: particle.rotation + 720,
              x: particle.x + (Math.random() - 0.5) * 200,
            }}
            transition={{
              duration: 2 + Math.random(),
              ease: 'easeOut',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
```

**Step 3: Create index export**

Create file `client/src/components/Celebration/index.ts`:

```typescript
export { Celebration } from './Celebration';
```

**Step 4: Commit Celebration component**

```bash
git add client/src/components/Celebration/
git commit -m "feat(client): add Celebration particle animation"
```

---

## Task 5: Integrate All Components into Game

**Files:**
- Modify: `client/src/components/Game/Game.tsx`
- Modify: `client/src/components/Game/Game.css`
- Modify: `client/src/components/Game/useGame.ts`

**Step 1: Update useGame hook to handle completion**

Update `client/src/components/Game/useGame.ts`:

```typescript
import { useState, useCallback, useEffect, useRef } from 'react';
import type { Puzzle, GameState, ShipColor, Direction, PlayerStats, StarRating } from '@slidecraft/shared';
import { createGameState, applyMove, resetGameState, calculateStarRating } from '@slidecraft/shared';
import { apiClient } from '../../api';

interface GameResult {
  starRating: StarRating;
  stats: PlayerStats | null;
}

export function useGame(puzzle: Puzzle | null) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedShip, setSelectedShip] = useState<ShipColor | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(0);
  const hasSubmittedRef = useRef(false);

  // Initialize game state when puzzle loads
  useEffect(() => {
    if (puzzle) {
      setGameState(createGameState(puzzle));
      setSelectedShip(null);
      setShowCelebration(false);
      setShowResults(false);
      setGameResult(null);
      hasSubmittedRef.current = false;
    }
  }, [puzzle]);

  // Calculate cell size based on board dimensions
  useEffect(() => {
    const updateCellSize = () => {
      if (boardRef.current) {
        const boardWidth = boardRef.current.offsetWidth;
        const padding = 8;
        const gaps = 15;
        const availableWidth = boardWidth - padding - gaps;
        setCellSize(availableWidth / 16);
      }
    };

    updateCellSize();
    window.addEventListener('resize', updateCellSize);
    return () => window.removeEventListener('resize', updateCellSize);
  }, []);

  // Submit solution when game is completed
  useEffect(() => {
    if (!gameState?.completed || !puzzle || hasSubmittedRef.current) return;

    hasSubmittedRef.current = true;
    setShowCelebration(true);

    const submitSolution = async () => {
      setSubmitting(true);
      try {
        const response = await apiClient.submitSolution({
          puzzleId: puzzle.id,
          moves: gameState.moves,
          timeSeconds: gameState.completionTime || 0,
        });

        setGameResult({
          starRating: response.starRating,
          stats: response.stats,
        });
      } catch (error) {
        console.error('Failed to submit solution:', error);
        // Calculate star rating locally if submission fails
        setGameResult({
          starRating: calculateStarRating(gameState.moveCount, puzzle.optimalMoves),
          stats: null,
        });
      } finally {
        setSubmitting(false);
      }
    };

    submitSolution();
  }, [gameState?.completed, puzzle]);

  const handleCelebrationComplete = useCallback(() => {
    setShowCelebration(false);
    setShowResults(true);
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

  const closeResults = useCallback(() => {
    setShowResults(false);
  }, []);

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
    showCelebration,
    showResults,
    gameResult,
    submitting,
    handleCelebrationComplete,
    closeResults,
  };
}
```

**Step 2: Update Game component**

Update `client/src/components/Game/Game.tsx`:

```typescript
import type { Puzzle, Direction } from '@slidecraft/shared';
import { Board } from '../Board';
import { Ship } from '../Ship';
import { Timer } from '../Timer';
import { Celebration } from '../Celebration';
import { ResultsScreen } from '../ResultsScreen';
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
    showCelebration,
    showResults,
    gameResult,
    handleCelebrationComplete,
    closeResults,
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
          <span className="game__moves">
            Moves: <strong>{gameState.moveCount}</strong>
            <span className="game__optimal"> / {puzzle.optimalMoves}</span>
          </span>
          <Timer
            startTime={gameState.startTime}
            running={!gameState.completed}
            finalTime={gameState.completionTime}
          />
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
      </div>

      <div className="game__controls">
        <button
          className="game__button"
          onClick={reset}
          disabled={gameState.completed}
        >
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

      <div className="game__instructions">
        {!selectedShip && !gameState.completed && (
          <p>Click a ship to select it, then use arrow keys or buttons to move</p>
        )}
        {selectedShip && !gameState.completed && (
          <p>
            <span className={`game__selected-indicator game__selected-indicator--${selectedShip}`}>
              ●
            </span>
            {' '}ship selected - press arrow keys or buttons to move
          </p>
        )}
      </div>

      <Celebration active={showCelebration} onComplete={handleCelebrationComplete} />

      {showResults && gameResult && (
        <ResultsScreen
          puzzle={puzzle}
          moveCount={gameState.moveCount}
          timeSeconds={gameState.completionTime || 0}
          starRating={gameResult.starRating}
          stats={gameResult.stats}
          onClose={closeResults}
        />
      )}
    </div>
  );
}
```

**Step 3: Update Game CSS**

Update `client/src/components/Game/Game.css`:

```css
.game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  max-width: 100%;
}

.game__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 600px;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.game__title {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0;
}

.game__stats {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.game__moves {
  font-size: 0.9rem;
}

.game__optimal {
  opacity: 0.6;
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

.game__button:hover:not(:disabled) {
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
  transition: background 0.2s, transform 0.1s;
}

.game__direction-button:hover:not(:disabled) {
  background: #5a5a7a;
}

.game__direction-button:active:not(:disabled) {
  transform: scale(0.95);
}

.game__direction-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.game__direction-button--up { grid-area: up; }
.game__direction-button--down { grid-area: down; }
.game__direction-button--left { grid-area: left; }
.game__direction-button--right { grid-area: right; }

.game__instructions {
  font-size: 0.85rem;
  opacity: 0.7;
  text-align: center;
  min-height: 1.5rem;
}

.game__selected-indicator {
  font-size: 0.75rem;
}

.game__selected-indicator--red { color: #ff4444; }
.game__selected-indicator--blue { color: #4444ff; }
.game__selected-indicator--green { color: #44ff44; }
.game__selected-indicator--yellow { color: #ffff44; }
```

**Step 4: Commit Game integration**

```bash
git add client/src/components/Game/
git commit -m "feat(client): integrate Timer, Celebration, and ResultsScreen into Game"
```

---

## Task 6: Add Mobile Touch Improvements

**Files:**
- Modify: `client/index.html`
- Modify: `client/src/components/Board/Board.css`

**Step 1: Update index.html for mobile**

Update `client/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#1a1a2e" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <title>SlideCraft</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        -webkit-tap-highlight-color: transparent;
      }
      html, body {
        overflow: hidden;
        overscroll-behavior: none;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #1a1a2e;
        color: #eee;
        min-height: 100vh;
        min-height: 100dvh;
      }
      #root {
        min-height: 100vh;
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 2: Add responsive styles to Board**

Update `client/src/components/Board/Board.css`:

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
  width: 100%;
  touch-action: none;
  user-select: none;
}

@media (max-width: 480px) {
  .board {
    border-radius: 4px;
    padding: 2px;
    gap: 0;
  }
}

.cell {
  background: #1a1a2e;
  border-radius: 2px;
  position: relative;
}

@media (max-width: 480px) {
  .cell {
    border-radius: 1px;
  }
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

@media (max-width: 480px) {
  .force-field--up,
  .force-field--down {
    height: 2px;
  }
  
  .force-field--left,
  .force-field--right {
    width: 2px;
  }
}
```

**Step 3: Commit mobile improvements**

```bash
git add client/index.html client/src/components/Board/Board.css
git commit -m "feat(client): improve mobile touch handling and responsive design"
```

---

## Task 7: Final Testing and Cleanup

**Files:**
- Modify: `client/src/App.test.tsx`
- Create: `client/src/components/Game/Game.test.tsx`

**Step 1: Update App test**

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
        id: 42,
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
    submitSolution: vi.fn().mockResolvedValue({
      valid: true,
      starRating: 5,
      stats: {
        discordUserId: 'mock-user-123',
        gamesPlayed: 1,
        gamesWon: 1,
        currentStreak: 1,
        maxStreak: 1,
        averageMoves: 3,
        averageTime: 30,
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
      expect(screen.getByText(/SlideCraft #42/)).toBeInTheDocument();
    });
  });

  it('shows move count starting at 0', async () => {
    renderWithDiscord(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Moves:/)).toBeInTheDocument();
    });
  });

  it('shows optimal moves', async () => {
    renderWithDiscord(<App />);

    await waitFor(() => {
      expect(screen.getByText(/\/ 3/)).toBeInTheDocument();
    });
  });

  it('renders reset button', async () => {
    renderWithDiscord(<App />);

    await waitFor(() => {
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });
  });

  it('shows username when authenticated', async () => {
    renderWithDiscord(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Playing as DevUser/)).toBeInTheDocument();
    });
  });

  it('shows direction buttons', async () => {
    renderWithDiscord(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText('Move up')).toBeInTheDocument();
      expect(screen.getByLabelText('Move down')).toBeInTheDocument();
      expect(screen.getByLabelText('Move left')).toBeInTheDocument();
      expect(screen.getByLabelText('Move right')).toBeInTheDocument();
    });
  });
});
```

**Step 2: Run all tests**

Run: `bun run test`
Expected: All tests pass

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: No TypeScript errors

**Step 4: Final commit**

```bash
git add .
git commit -m "test: update tests for complete game flow"
```

---

## Summary

After completing this plan, you will have a complete, polished SlideCraft game with:

1. **Timer Component** - Shows elapsed time during gameplay, stops on completion
2. **Star Rating Component** - Animated star display based on performance
3. **Results Screen** - Modal showing:
   - Puzzle number and star rating
   - Move count vs optimal
   - Time taken
   - Player statistics (games, win %, streaks)
   - Share button
4. **Celebration Animation** - Confetti particles on win
5. **Share Functionality** - Copies formatted result to clipboard:
   ```
   SlideCraft #42
   ★★★★★
   Moves: 3/3
   Time: 0:45
   ```
6. **Solution Submission** - Automatically submits to server on completion
7. **Mobile Improvements** - Touch-friendly, responsive design
8. **Complete Integration** - All components working together

The game is now feature-complete and ready for deployment as a Discord Activity!

## Full Feature Checklist

- [x] 16x16 game board with grid
- [x] 4 colored ships with distinct shapes
- [x] Asteroids and force field obstacles
- [x] Ship selection (click/tap)
- [x] Ship movement (keyboard + buttons)
- [x] Sliding movement until obstacle
- [x] Win detection (red ship on astronaut)
- [x] Move counter
- [x] Timer
- [x] Reset button
- [x] Celebration animation
- [x] Results screen with stats
- [x] Star rating system
- [x] Share to clipboard
- [x] Discord OAuth authentication
- [x] Puzzle fetching from API
- [x] Solution submission to server
- [x] Player statistics tracking
- [x] Mobile-responsive design
