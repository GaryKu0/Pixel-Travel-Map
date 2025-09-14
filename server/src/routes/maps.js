import express from 'express';
import { getDb } from '../database.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get all maps for current user
router.get('/', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const maps = await db.all('SELECT * FROM maps WHERE user_id = ? ORDER BY updated_at DESC', [req.user.id]);
    res.json(maps);
  } catch (error) {
    console.error('Get maps error:', error);
    res.status(500).json({ error: 'Failed to get maps' });
  }
});

// Get specific map with all memories
router.get('/:mapId', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const { mapId } = req.params;
    
    // Check if user owns this map
    const map = await db.get('SELECT * FROM maps WHERE id = ? AND user_id = ?', [mapId, req.user.id]);
    
    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }
    
    // Get all memories for this map
    const memories = await db.all('SELECT * FROM memories WHERE map_id = ? ORDER BY created_at DESC', [mapId]);
    
    // Get photos for each memory
    for (const memory of memories) {
      const photos = await db.all('SELECT * FROM photos WHERE memory_id = ?', [memory.id]);
      memory.photos = photos;
      // Parse JSON fields
      if (memory.content_bounds) {
        memory.content_bounds = JSON.parse(memory.content_bounds);
      }
    }
    
    res.json({ map, memories });
  } catch (error) {
    console.error('Get map error:', error);
    res.status(500).json({ error: 'Failed to get map' });
  }
});

// Create new map
router.post('/', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const { name, is_public = false } = req.body;
    
    const result = await db.run(
      'INSERT INTO maps (user_id, name, is_public) VALUES (?, ?, ?)',
      [req.user.id, name || 'New Map', is_public]
    );
    
    const map = await db.get('SELECT * FROM maps WHERE id = ?', [result.lastID]);
    res.json(map);
  } catch (error) {
    console.error('Create map error:', error);
    res.status(500).json({ error: 'Failed to create map' });
  }
});

// Update map
router.put('/:mapId', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const { mapId } = req.params;
    const { name, is_public } = req.body;
    
    // Check ownership
    const map = await db.get('SELECT * FROM maps WHERE id = ? AND user_id = ?', [mapId, req.user.id]);
    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }
    
    await db.run(
      'UPDATE maps SET name = ?, is_public = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name || map.name, is_public !== undefined ? is_public : map.is_public, mapId]
    );
    
    const updatedMap = await db.get('SELECT * FROM maps WHERE id = ?', [mapId]);
    res.json(updatedMap);
  } catch (error) {
    console.error('Update map error:', error);
    res.status(500).json({ error: 'Failed to update map' });
  }
});

// Delete map
router.delete('/:mapId', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const { mapId } = req.params;
    
    // Check ownership
    const map = await db.get('SELECT * FROM maps WHERE id = ? AND user_id = ?', [mapId, req.user.id]);
    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }
    
    await db.run('DELETE FROM maps WHERE id = ?', [mapId]);
    res.json({ message: 'Map deleted successfully' });
  } catch (error) {
    console.error('Delete map error:', error);
    res.status(500).json({ error: 'Failed to delete map' });
  }
});

// Export map data
router.get('/:mapId/export', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const { mapId } = req.params;
    
    // Check ownership
    const map = await db.get('SELECT * FROM maps WHERE id = ? AND user_id = ?', [mapId, req.user.id]);
    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }
    
    // Get all memories with photos
    const memories = await db.all('SELECT * FROM memories WHERE map_id = ?', [mapId]);
    
    for (const memory of memories) {
      const photos = await db.all('SELECT photo_data, filename FROM photos WHERE memory_id = ?', [memory.id]);
      memory.photos = photos;
      if (memory.content_bounds) {
        memory.content_bounds = JSON.parse(memory.content_bounds);
      }
    }
    
    const exportData = {
      version: '2.0.0',
      map,
      memories,
      exportDate: new Date().toISOString()
    };
    
    res.json(exportData);
  } catch (error) {
    console.error('Export map error:', error);
    res.status(500).json({ error: 'Failed to export map' });
  }
});

// Import map data
router.post('/:mapId/import', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const { mapId } = req.params;
    const { memories } = req.body;
    
    // Check ownership
    const map = await db.get('SELECT * FROM maps WHERE id = ? AND user_id = ?', [mapId, req.user.id]);
    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }
    
    // Clear existing memories if requested
    if (req.body.clearExisting) {
      await db.run('DELETE FROM memories WHERE map_id = ?', [mapId]);
    }
    
    // Import memories
    for (const memory of memories) {
      const contentBounds = typeof memory.content_bounds === 'string' 
        ? memory.content_bounds 
        : JSON.stringify(memory.content_bounds);
      
      const result = await db.run(`
        INSERT INTO memories (
          map_id, source_type, source_data, processed_image,
          lat, lng, width, height, content_bounds,
          flipped_horizontally, is_locked,
          log_location, log_date, log_musings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        mapId,
        memory.source_type,
        memory.source_data,
        memory.processed_image,
        memory.lat,
        memory.lng,
        memory.width || 120,
        memory.height || 120,
        contentBounds,
        memory.flipped_horizontally || 0,
        memory.is_locked || 0,
        memory.log_location || '',
        memory.log_date || '',
        memory.log_musings || ''
      ]);
      
      // Import photos if present
      if (memory.photos && memory.photos.length > 0) {
        for (const photo of memory.photos) {
          await db.run(
            'INSERT INTO photos (memory_id, photo_data, filename) VALUES (?, ?, ?)',
            [result.lastID, photo.photo_data || photo, photo.filename || '']
          );
        }
      }
    }
    
    res.json({ message: 'Map imported successfully' });
  } catch (error) {
    console.error('Import map error:', error);
    res.status(500).json({ error: 'Failed to import map' });
  }
});

export default router;