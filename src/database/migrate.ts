/**
 * Database Migration Script
 *
 * This script runs database migrations to set up or update the schema.
 * Migrations are tracked in the metadata table to ensure they only run once.
 *
 * Run with: npm run db:migrate
 */

import { db, initializeSchema } from './index.js';

/**
 * Migration definition
 * Each migration has a version, name, and up function
 */
interface Migration {
  version: string;
  name: string;
  up: () => void;
}

/**
 * All migrations in order
 * Add new migrations to the end of this array
 */
const MIGRATIONS: Migration[] = [
  {
    version: '001',
    name: 'initial_schema',
    up: () => {
      // Initial schema is created by initializeSchema()
      // This is a placeholder for the first migration
    },
  },
  {
    version: '002',
    name: 'add_updated_at_to_reservations',
    up: () => {
      // Add updatedAt column if it doesn't exist
      try {
        db.exec(`
          ALTER TABLE reservations ADD COLUMN updatedAt INTEGER
            DEFAULT (strftime('%s', 'now') * 1000);
        `);
        console.log('  ✓ Added updatedAt column to reservations');
      } catch (error) {
        // Column might already exist - that's okay
        if ((error as any).message?.includes('duplicate column')) {
          console.log('  - Column updatedAt already exists');
        } else {
          throw error;
        }
      }
    },
  },
  // Add future migrations here
  // {
  //   version: '003',
  //   name: 'example_future_migration',
  //   up: () => {
  //     db.exec(`...`);
  //   },
  // },
];

/**
 * Get the current migration version from the database
 */
function getCurrentVersion(): string {
  const row = db.prepare('SELECT value FROM metadata WHERE key = ?').get('migration_version');
  return (row as { value: string } | undefined)?.value || '000';
}

/**
 * Set the migration version in the database
 */
function setCurrentVersion(version: string): void {
  const now = Date.now();
  const insert = db.prepare(`
    INSERT INTO metadata (key, value, updatedAt) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = ?, updatedAt = ?
  `);
  insert.run('migration_version', version, now, version, now);
}

/**
 * Run a single migration
 */
function runMigration(migration: Migration): void {
  console.log(`  → Running migration ${migration.version}: ${migration.name}`);
  migration.up();
}

/**
 * Run all pending migrations
 */
function migrate(): void {
  console.log('🔄 Running database migrations...\n');

  try {
    // Initialize schema first (creates tables if needed)
    initializeSchema();

    // Get current version
    const currentVersion = getCurrentVersion();
    console.log(`Current migration version: ${currentVersion}`);

    // Filter pending migrations
    const pendingMigrations = MIGRATIONS.filter((m) => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
      console.log('✅ Database is up to date!');
      return;
    }

    // Run pending migrations
    console.log(`\nRunning ${pendingMigrations.length} pending migration(s):\n`);

    for (const migration of pendingMigrations) {
      runMigration(migration);
      setCurrentVersion(migration.version);
    }

    console.log('\n✅ Migrations completed successfully!');
    console.log(`New migration version: ${MIGRATIONS[MIGRATIONS.length - 1].version}`);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Rollback to a specific version (optional - for advanced use)
 * This would need explicit rollback functions defined
 */
function rollback(targetVersion: string): void {
  console.log(`⚠️  Rollback to version ${targetVersion} not implemented`);
  console.log('   For production systems, consider creating a new migration');
  throw new Error('Rollback not implemented');
}

/**
 * Run migration if executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
}

export { migrate, rollback };
