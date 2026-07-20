import jwt from 'jsonwebtoken';
import User from '../models/UserModel.js';

/**
 * Simple in-process TTL cache to avoid a DB lookup on every request.
 * Cache entries expire after TTL_MS. On logout or user status change the
 * relevant entry should be invalidated — but the worst case is a 60-second
 * delay before a suspended user is blocked (acceptable for this system).
 */
const userCache = new Map();
const TTL_MS = 60 * 1000; // 60 seconds

function getCachedUser(userId) {
  const entry = userCache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) {
    userCache.delete(userId);
    return null;
  }
  return entry.user;
}

function setCachedUser(userId, user) {
  // Evict oldest entries if cache grows too large (safety valve)
  if (userCache.size > 500) {
    const firstKey = userCache.keys().next().value;
    userCache.delete(firstKey);
  }
  userCache.set(userId, { user, ts: Date.now() });
}

/** Call this when a user is suspended or deleted to immediately invalidate their cache entry */
export function invalidateUserCache(userId) {
  userCache.delete(String(userId));
}

function Authenticated() {
  return async (req, res, next) => {
    try {
      const token = req.cookies.jwt;
      if (!token) throw new Error('Authentication required');

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = String(decoded.userId);

      // Try cache first to avoid a DB round-trip on every request
      let user = getCachedUser(userId);
      if (!user) {
        user = await User.findById(userId).lean();
        if (user) setCachedUser(userId, user);
      }

      if (!user) throw new Error('User not found');
      if (user.status !== 'approved') {
        throw new Error('Account needs pending approval');
      }

      req.user = user;
      next();
    } catch (err) {
      res.status(401).json({ message: err.message });
    }
  };
}

export default Authenticated;