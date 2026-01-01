import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { pool, query, queryOne } from './connection.js';

interface Migration {
  id: number;
  name: string;
  applied_at: Date;
}

const MIGRATIONS_DIR = path.join(import.meta.dir, 'migrations');

/**
 * Run all pending migrations.
 */
export async function runMigrations(): Promise<void> {
  console.log('Running database migrations...');

  // Ensure migrations table exists
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Get list of migration files
  const files = await readdir(MIGRATIONS_DIR);
  const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();

  for (const file of sqlFiles) {
    // Check if migration already applied
    const existing = await queryOne<Migration>(
      'SELECT * FROM migrations WHERE name = $1',
      [file]
    );

    if (existing) {
      console.log(`  Skipping ${file} (already applied)`);
      continue;
    }

    // Read and execute migration
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = await readFile(filePath, 'utf-8');

    console.log(`  Applying ${file}...`);
    await query(sql);

    // Record migration
    await query('INSERT INTO migrations (name) VALUES ($1)', [file]);
    console.log(`  Applied ${file}`);
  }

  console.log('Migrations complete');
}

// Run migrations if executed directly
if (import.meta.main) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
