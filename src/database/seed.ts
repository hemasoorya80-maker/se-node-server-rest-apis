/**
 * Database Seed Script
 *
 * This script populates the database with initial sample data.
 * It's safe to run multiple times - it checks for existing data first.
 *
 * Run with: npm run db:seed
 */

import { db, initializeSchema } from './index.js';
import type { ItemRow } from '../types/index.js';

/**
 * Sample items data
 * These are the inventory items available for reservation
 */
const SAMPLE_ITEMS: Omit<ItemRow, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'item_1',
    name: 'Wireless Mouse',
    availableQty: 3,
  },
  {
    id: 'item_2',
    name: 'Mechanical Keyboard',
    availableQty: 2,
  },
  {
    id: 'item_3',
    name: 'USB-C Hub',
    availableQty: 5,
  },
  {
    id: 'item_4',
    name: '4K Monitor',
    availableQty: 1,
  },
  {
    id: 'item_5',
    name: 'Noise-Cancelling Headphones',
    availableQty: 4,
  },
  {
    id: 'item_6',
    name: 'Webcam 1080p',
    availableQty: 6,
  },
  {
    id: 'item_7',
    name: 'Laptop Stand',
    availableQty: 8,
  },
  {
    id: 'item_8',
    name: 'External SSD 1TB',
    availableQty: 2,
  },
];

/**
 * Seed items table
 * Only inserts if table is empty
 */
function seedItems(): void {
  // Check if items already exist
  const existingCount = db
    .prepare('SELECT COUNT(*) as count FROM items')
    .get() as { count: number };

  if (existingCount.count > 0) {
    console.log(`✓ Items table already has ${existingCount.count} rows - skipping seed`);
    return;
  }

  const now = Date.now();
  const insert = db.prepare(`
    INSERT INTO items (id, name, availableQty, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: typeof SAMPLE_ITEMS) => {
    for (const item of items) {
      insert.run(item.id, item.name, item.availableQty, now, now);
    }
  });

  insertMany(SAMPLE_ITEMS);
  console.log(`✓ Seeded ${SAMPLE_ITEMS.length} items`);
}

/**
 * Seed all tables
 */
function seedAll(): void {
  console.log('🌱 Starting database seed...\n');

  try {
    // Initialize schema first
    initializeSchema();

    // Seed items
    seedItems();

    console.log('\n✅ Database seed completed successfully!');
    console.log('\n📊 Summary:');
    const itemCount = db.prepare('SELECT COUNT(*) as count FROM items').get() as { count: number };
    console.log(`   Items: ${itemCount.count}`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

/**
 * Run seed if executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAll();
}

export { seedAll };
