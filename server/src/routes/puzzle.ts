import { Router, type Router as RouterType } from 'express';
import { getTodaysPuzzle, getPuzzleByDate } from '../repositories/index.js';
import type { PuzzleResponse, ApiError } from '@slidecraft/shared';

const router: RouterType = Router();

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
