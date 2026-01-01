import { describe, it, expect } from 'bun:test';
import { checkWin, createGameState, applyMove, resetGameState } from './state';
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

  it('does not count move if ship does not move', () => {
    const puzzle = createTestPuzzle();
    const state = createGameState(puzzle);

    // Red ship at (0,0), moving left should not move (already at edge)
    const newState = applyMove(state, 'red', 'left');

    expect(newState.moveCount).toBe(0);
    expect(newState.moves).toEqual([]);
  });
});

describe('resetGameState', () => {
  it('resets ships to initial positions', () => {
    const puzzle = createTestPuzzle();
    let state = createGameState(puzzle);
    state = applyMove(state, 'red', 'right');

    const resetState = resetGameState(state);

    expect(resetState.ships[0].position).toEqual({ x: 0, y: 0 });
    expect(resetState.moveCount).toBe(0);
    expect(resetState.moves).toEqual([]);
    expect(resetState.completed).toBe(false);
  });

  it('preserves start time', () => {
    const puzzle = createTestPuzzle();
    const state = createGameState(puzzle);
    const originalStartTime = state.startTime;

    const resetState = resetGameState(state);

    expect(resetState.startTime).toBe(originalStartTime);
  });
});
