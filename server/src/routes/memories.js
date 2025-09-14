import express from 'express';
import { getDb } from '../database.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Add memory to map
router.post('/', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const {
      map_id,
      source_type,
      source_data,
      processed_image,
      lat,
      lng,
      width,
      height,
      content_bounds,
      flipped_horizontally,
      is_locked,
      log_location,
      log_date,
      log_musings,
      photos
    } = req.body;
    
    // Verify map ownership
    const map = await db.get('SELECT * FROM maps WHERE id = ? AND user_id = ?', [map_id, req.user.id]);
    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }
    
    const contentBoundsStr = typeof content_bounds === 'string' 
      ? content_bounds 
      : JSON.stringify(content_bounds);
    
    const result = await db.run(`
      INSERT INTO memories (
        map_id, source_type, source_data, processed_image,
        lat, lng, width, height, content_bounds,
        flipped_horizontally, is_locked,
        log_location, log_date, log_musings
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      map_id,
      source_type,
      source_data,
      processed_image,
      lat,
      lng,
      width || 120,
      height || 120,
      contentBoundsStr,
      flipped_horizontally || 0,
      is_locked || 0,
      log_location || '',
      log_date || '',
      log_musings || ''
    ]);
    
    // Add photos if provided
    if (photos && photos.length > 0) {
      for (const photo of photos) {
        await db.run(
          'INSERT INTO photos (memory_id, photo_data, filename) VALUES (?, ?, ?)',
          [result.lastID, photo.data || photo, photo.filename || '']
        );
      }
    }
    
    const memory = await db.get('SELECT * FROM memories WHERE id = ?', [result.lastID]);
    res.json(memory);
  } catch (error) {
    console.error('Add memory error:', error);
    res.status(500).json({ error: 'Failed to add memory' });
  }
});

// Update memory
router.put('/:memoryId', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const { memoryId } = req.params;
    
    // Check ownership through map
    const memory = await db.get(`
      SELECT m.*, mp.user_id 
      FROM memories m 
      JOIN maps mp ON m.map_id = mp.id 
      WHERE m.id = ? AND mp.user_id = ?
    `, [memoryId, req.user.id]);
    
    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    
    const updates = [];
    const values = [];
    
    // Build dynamic update query
    const updateableFields = [
      'processed_image', 'lat', 'lng', 'width', 'height',
      'content_bounds', 'flipped_horizontally', 'is_locked',
      'log_location', 'log_date', 'log_musings'
    ];
    
    for (const field of updateableFields) {
      if (req.body[field] !== undefined) {
        if (field === 'content_bounds') {
          updates.push(`${field} = ?`);
          values.push(typeof req.body[field] === 'string' 
            ? req.body[field] 
            : JSON.stringify(req.body[field]));
        } else {
          updates.push(`${field} = ?`);
          values.push(req.body[field]);
        }
      }
    }
    
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(memoryId);
      
      await db.run(
        `UPDATE memories SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }
    
    const updatedMemory = await db.get('SELECT * FROM memories WHERE id = ?', [memoryId]);
    res.json(updatedMemory);
  } catch (error) {
    console.error('Update memory error:', error);
    res.status(500).json({ error: 'Failed to update memory' });
  }
});

// Delete memory
router.delete('/:memoryId', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const { memoryId } = req.params;
    
    // Check ownership through map
    const memory = await db.get(`
      SELECT m.*, mp.user_id 
      FROM memories m 
      JOIN maps mp ON m.map_id = mp.id 
      WHERE m.id = ? AND mp.user_id = ?
    `, [memoryId, req.user.id]);
    
    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    
    await db.run('DELETE FROM memories WHERE id = ?', [memoryId]);
    res.json({ message: 'Memory deleted successfully' });
  } catch (error) {
    console.error('Delete memory error:', error);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

// Add photo to memory
router.post('/:memoryId/photos', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const { memoryId } = req.params;
    const { photo_data, filename } = req.body;
    
    // Check ownership through map
    const memory = await db.get(`
      SELECT m.*, mp.user_id 
      FROM memories m 
      JOIN maps mp ON m.map_id = mp.id 
      WHERE m.id = ? AND mp.user_id = ?
    `, [memoryId, req.user.id]);
    
    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    
    const result = await db.run(
      'INSERT INTO photos (memory_id, photo_data, filename) VALUES (?, ?, ?)',
      [memoryId, photo_data, filename || '']
    );
    
    const photo = await db.get('SELECT * FROM photos WHERE id = ?', [result.lastID]);
    res.json(photo);
  } catch (error) {
    console.error('Add photo error:', error);
    res.status(500).json({ error: 'Failed to add photo' });
  }
});

// Delete photo
router.delete('/photos/:photoId', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const { photoId } = req.params;
    
    // Check ownership through memory and map
    const photo = await db.get(`
      SELECT p.*, mp.user_id 
      FROM photos p
      JOIN memories m ON p.memory_id = m.id
      JOIN maps mp ON m.map_id = mp.id 
      WHERE p.id = ? AND mp.user_id = ?
    `, [photoId, req.user.id]);
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    await db.run('DELETE FROM photos WHERE id = ?', [photoId]);
    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

export default router;