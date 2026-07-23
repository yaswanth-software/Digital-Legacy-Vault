import { getUserProfile } from '../services/userService.js';

/**
 * GET /api/users/me
 * Returns the authenticated user's profile from Firestore
 */
export async function getMe(req, res, next) {
  try {
    const { uid } = req.user;

    const userProfile = await getUserProfile(uid);

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    res.json({
      success: true,
      user: {
        uid: userProfile.uid,
        displayName: userProfile.displayName,
        email: userProfile.email,
        photoURL: userProfile.photoURL,
        role: userProfile.role,
        createdAt: userProfile.createdAt,
        lastLoginAt: userProfile.lastLoginAt,
      },
    });
  } catch (error) {
    next(error);
  }
}
