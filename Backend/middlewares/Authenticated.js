import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";

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
  if (userCache.size > 500) {
    const firstKey = userCache.keys().next().value;
    userCache.delete(firstKey);
  }
  userCache.set(userId, { user, ts: Date.now() });
}

export function invalidateUserCache(userId) {
  userCache.delete(String(userId));
}

function Authenticated() {
  return async (req, res, next) => {
    try {
      const token = req.cookies.jwt;
      if (!token) throw new Error("Authentication required");

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = String(decoded.userId);

      let user = getCachedUser(userId);
      if (!user) {
        const userInstance = await User.findByPk(userId);
        if (userInstance) {
          user = userInstance.toJSON();
          setCachedUser(userId, user);
        }
      }

      if (!user) throw new Error("User not found");
      if (user.status !== "approved") {
        throw new Error("Account needs pending approval");
      }

      req.user = user;
      next();
    } catch (err) {
      res.status(401).json({ message: err.message });
    }
  };
}

export default Authenticated;