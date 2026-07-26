import { authAdmin } from '../config/firebaseAdmin.js';

export async function authenticate(req, res, next) {
  if (!authAdmin) {
    return res.status(503).json({
      success: false,
      message: 'Authentication service is unavailable. Please add FIREBASE_SERVICE_ACCOUNT_JSON to Vercel Environment Variables.',
    });
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.',
      });
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token format.',
      });
    }

    // Verify the Firebase ID token
    const decodedToken = await authAdmin.verifyIdToken(token);

    // Attach the verified user info to the request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name || null,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error.code || error.message);

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has expired. Please sign in again.',
      });
    }

    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has been revoked. Please sign in again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
    });
  }
}
