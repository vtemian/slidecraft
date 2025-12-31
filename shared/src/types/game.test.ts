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
