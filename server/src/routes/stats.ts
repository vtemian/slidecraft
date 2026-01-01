import { Router, type Router as RouterType } from 'express';
import { getOrCreatePlayer, getPlayerAverages } from '../repositories/index.js';
import type { StatsResponse, ApiError, PlayerStats } from '@slidecraft/shared';

const router: RouterType = Router();

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
