import { createPuzzle, getPuzzleByDate } from '../repositories/puzzleRepository.js';
import { closePool } from './connection.js';
import { runMigrations } from './migrate.js';

/**
 * Seed the database with a puzzle for today.
 */
async function seed() {
  console.log('Seeding database...');

  // Run migrations first
  await runMigrations();

  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  // Check if puzzle already exists
  const existing = await getPuzzleByDate(today);
  if (existing) {
    console.log(`Puzzle for ${today} already exists (ID: ${existing.id})`);
    await closePool();
    return;
  }

  // Create today's puzzle
  const puzzle = await createPuzzle({
    date: today,
    ships: [
      { color: 'red', position: { x: 2, y: 2 } },
      { color: 'blue', position: { x: 8, y: 5 } },
      { color: 'green', position: { x: 12, y: 10 } },
      { color: 'yellow', position: { x: 5, y: 14 } },
    ],
    obstacles: [
      { type: 'asteroid', position: { x: 5, y: 2 } },
      { type: 'asteroid', position: { x: 10, y: 8 } },
      { type: 'asteroid', position: { x: 3, y: 12 } },
      { type: 'forceField', position: { x: 7, y: 5 }, edge: 'right' },
      { type: 'forceField', position: { x: 14, y: 2 }, edge: 'down' },
    ],
    astronaut: { x: 14, y: 2 },
    optimalMoves: 3,
  });

  console.log(`Created puzzle for ${today} (ID: ${puzzle.id})`);
  await closePool();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
