import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db = null;

export async function getDb(forceReconnect = false) {
  if (!db || forceReconnect) {
    if (db && forceReconnect) {
      db.close();
      db = null;
    }

    const dbPath = process.env.DB_PATH || join(__dirname, '..', 'db', 'pixelmap.db');
    const dbDir = dirname(dbPath);

    // Ensure database directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');

    // Add wrapper methods to match sqlite interface
    const originalExec = db.exec.bind(db);
    db.get = (sql, params = []) => db.prepare(sql).get(params);
    db.all = (sql, params = []) => db.prepare(sql).all(params);
    db.run = (sql, params = []) => {
      const result = db.prepare(sql).run(params);
      return { lastID: result.lastInsertRowid, changes: result.changes };
    };
    db.exec = originalExec;
  }
  return db;
}

export async function initializeDatabase() {
  const database = await getDb();
  
  // Users table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      display_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Maps table (each user can have multiple maps)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS maps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_public BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  
  // Memories table (markers on the map)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      map_id INTEGER NOT NULL,
      source_type TEXT CHECK(source_type IN ('file', 'text')) NOT NULL,
      source_data TEXT, -- Base64 encoded file or text prompt
      processed_image TEXT, -- Base64 encoded processed image
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      width INTEGER DEFAULT 120,
      height INTEGER DEFAULT 120,
      content_bounds TEXT, -- JSON string
      flipped_horizontally BOOLEAN DEFAULT 0,
      is_locked BOOLEAN DEFAULT 0,
      log_location TEXT,
      log_date TEXT,
      log_musings TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE
    )
  `);
  
  // Photos table (additional photos for each memory)
  await database.exec(`
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memory_id INTEGER NOT NULL,
      photo_data TEXT NOT NULL, -- Base64 encoded image
      filename TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
    )
  `);
  
  // Create indexes for better performance
  await database.exec(`
    CREATE INDEX IF NOT EXISTS idx_maps_user_id ON maps(user_id);
    CREATE INDEX IF NOT EXISTS idx_memories_map_id ON memories(map_id);
    CREATE INDEX IF NOT EXISTS idx_photos_memory_id ON photos(memory_id);
  `);
  
  console.log('Database initialized successfully');
}

export default { getDb, initializeDatabase };