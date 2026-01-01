import { Router, type Router as RouterType } from 'express';
import { submitSolution, getOrCreatePlayer } from '../repositories/index.js';
import type { SolutionRequest, ApiError } from '@slidecraft/shared';

const router: RouterType = Router();

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
