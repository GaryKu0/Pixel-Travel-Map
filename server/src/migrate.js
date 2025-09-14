import { getDb } from './database.js';

async function migrateDatabase() {
  const db = await getDb();
  
  console.log('Starting database migration...');
  
  try {
    // Check if email column allows NULL
    const tableInfo = await db.all("PRAGMA table_info(users)");
    const emailColumn = tableInfo.find(col => col.name === 'email');
    
    if (emailColumn && emailColumn.notnull === 1) {
      console.log('Email column is NOT NULL, migrating...');
      
      // Check if there's existing data
      const userCount = await db.get('SELECT COUNT(*) as count FROM users');
      console.log('Current user count:', userCount.count);
      
      // Create new table with correct schema
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users_new (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT,
          display_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Copy existing data if any
      if (userCount.count > 0) {
        await db.exec(`
          INSERT INTO users_new (id, username, email, display_name, created_at, updated_at)
          SELECT id, username, email, display_name, created_at, updated_at
          FROM users
        `);
      }
      
      // Drop old table and rename new one
      await db.exec('DROP TABLE users');
      await db.exec('ALTER TABLE users_new RENAME TO users');
      
      console.log('Migration completed successfully');
    } else {
      console.log('Email column already allows NULL, no migration needed');
    }
    
    await db.close();
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

migrateDatabase()
  .then(() => {
    console.log('Database migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database migration failed:', error);
    process.exit(1);
  });