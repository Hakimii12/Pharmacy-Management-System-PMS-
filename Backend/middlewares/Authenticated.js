import jwt from 'jsonwebtoken';
import User from '../models/UserModel.js';
function Authenticated(){
  return async (req, res, next) => {
    try {
      const token = req.cookies.jwt;
      if (!token) throw new Error('Authentication required');

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) throw new Error('User not found');
      if (user.status !== "approved") {
        throw new Error('Account needs pending approval');
      }

      req.user = user;
      next();
    } catch (err) {
      res.status(401).json({ message: err.message });
    }
  };
};
export default Authenticated;