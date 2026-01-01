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
