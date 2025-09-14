import fetch from 'node-fetch';

const PASSKEY_API_URL = process.env.PASSKEY_API_URL;

export async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    
    // Verify token with passkey.okuso.uk
    const response = await fetch(`${PASSKEY_API_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const userData = await response.json();
    req.user = userData;
    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

export default verifyToken;