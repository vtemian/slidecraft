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
