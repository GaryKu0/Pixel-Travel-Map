import express from 'express';
import { getDb } from '../database.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Sync user data from passkey.okuso.uk after successful login
router.post('/sync', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const { id, username, email, displayName } = req.user;
    
    // Insert or update user
    await db.run(`
      INSERT INTO users (id, username, email, display_name)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        username = excluded.username,
        email = excluded.email,
        display_name = excluded.display_name,
        updated_at = CURRENT_TIMESTAMP
    `, [id, username, email, displayName || username]);
    
    // Get or create default map for user
    let map = await db.get('SELECT * FROM maps WHERE user_id = ? ORDER BY created_at ASC LIMIT 1', [id]);
    
    if (!map) {
      const result = await db.run(
        'INSERT INTO maps (user_id, name, is_public) VALUES (?, ?, ?)',
        [id, 'My Travel Map', false]
      );
      map = await db.get('SELECT * FROM maps WHERE id = ?', [result.lastID]);
    }
    
    res.json({ 
      user: { id, username, email, displayName },
      defaultMapId: map.id 
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync user data' });
  }
});

// Get current user info
router.get('/me', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

export default router;