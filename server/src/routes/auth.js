import express from 'express';
import { getDb } from '../database.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Sync user data from passkey.okuso.uk after successful login
router.post('/sync', verifyToken, async (req, res) => {
  try {
    const db = await getDb();
    
    console.log('Sync: Received user data:', req.user);
    
    // Extract user data from the nested structure
    const userData = req.user;
    const { id, username, email, displayName } = userData;
    
    console.log('Sync: Extracted user fields:', { id, username, email, displayName });

    // Prepare values for database insertion
    const dbParams = [
      id,
      username,
      email || null,
      displayName || username || null
    ];
    console.log('Sync: Database parameters:', dbParams);

    // Insert or update user (handle null values)
    await db.run(`
      INSERT INTO users (id, username, email, display_name)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        username = excluded.username,
        email = excluded.email,
        display_name = excluded.display_name,
        updated_at = CURRENT_TIMESTAMP
    `, dbParams);

    // Get or create default map for user
    let map = await db.get('SELECT * FROM maps WHERE user_id = ? ORDER BY created_at ASC LIMIT 1', [id]);

    if (!map) {
      const result = await db.run(
        'INSERT INTO maps (user_id, name, is_public) VALUES (?, ?, ?)',
        [id, 'My Travel Map', 0]
      );
      map = await db.get('SELECT * FROM maps WHERE id = ?', [result.lastID]);
    }
    
    const responseData = {
      user: { id, username, email, displayName },
      defaultMapId: map.id
    };
    console.log('Sync: Sending response:', responseData);
    res.json(responseData);
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