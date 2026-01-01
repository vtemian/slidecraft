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
