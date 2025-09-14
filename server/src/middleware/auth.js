import fetch from 'node-fetch';

const PASSKEY_API_URL = process.env.PASSKEY_API_URL;

export async function verifyToken(req, res, next) {
  try {
    console.log('Auth middleware: Verifying token...');
    console.log('PASSKEY_API_URL:', PASSKEY_API_URL);
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Auth middleware: No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    console.log('Auth middleware: Token found, length:', token.length);
    
    if (!PASSKEY_API_URL) {
      console.error('Auth middleware: PASSKEY_API_URL not configured');
      return res.status(500).json({ error: 'Auth service not configured' });
    }
    
    // Verify token with passkey.okuso.uk
    const verifyUrl = `${PASSKEY_API_URL}/api/auth/me`;
    console.log('Auth middleware: Verifying with:', verifyUrl);
    
    const response = await fetch(verifyUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Auth middleware: Passkey API response:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Auth middleware: Passkey API error:', errorText);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const userData = await response.json();
    console.log('Auth middleware: User data received:', userData);
    req.user = userData;
    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

export default verifyToken;