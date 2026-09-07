import bcrypt from 'bcryptjs';
import User from '../models/UserModel.js';
import { GenerateToken } from '../utils/GenerateToken.js';
import { invalidateUserCache } from '../middlewares/Authenticated.js';
import { getPagination, paginated, searchRegex } from '../utils/pagination.js';
// Register a new user
export async function RegisterUser(req, res) {
    try {
        const { name, email, password, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        if (!name || !email || !password || !role) {
            return res.status(400).json({ 
              message: "Name, email, password, and role are required" 
            });
          }
          if (role === "admin") {
            return res.status(403).json({ 
              message: "Admin registration is not allowed here"
            });
          }
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            role
        });

        await user.save();

        res.status(201).json({ message: 'User registered successfully. Waiting for admin approval' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
export async function AdminRegister(req,res){
    try {
        const { name, role, email, password } = req.body;
        if (role !== "admin") {
            return res
              .status(400)
              .json({ message: `${role} cannot be registered by admin` });
          }
          if (!name || !role || !email || !password) {
            return res.status(400).json({ message: "please fill all the fields" });
          }
          const user = await User.findOne({ email });
          if (user) {
            return res.status(400).json({ message: "user already exists" });
          }
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
          const newUser = new User({
            name: name,
            role: "admin",
            email: email,
            password: hashedPassword,
            status : "approved"
          });
          await newUser.save();

          // Creating an admin must not re-issue the caller's session cookie —
          // doing so logged the acting superAdmin in as the account they created.
          return res.status(201).json({
            message: "successfully created new Admin",
            user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role, status: newUser.status },
          });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

// Sign in user
export async function LoginUser(req, res) {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        if (user.status!=='approved'){
            return res.status(400).json("Account pending approval");
        } 
        // Generate JWT
        GenerateToken(user._id, user.role, res);
        res.json( { id: user._id, name: user.name, email: user.email,role: user.role} );
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
export async function GetUser(req,res){
  try {
       const id = req.params.id;
       const user = await User.findById(id).select("-password").lean();
       if (!user) {
           return res.status(404).json({ message: 'User not found' });
       }
       res.json({ id: user._id, name: user.name, email: user.email, role:user.role});
  } catch (error) {
      res.status(500).json({ message:error.message})
  }
}
export async function Logout(req, res) {
  try {
    // These options must mirror the ones GenerateToken sets, or the browser will
    // treat it as a different cookie and leave the session cookie in place.
    res.clearCookie("jwt", {
      httpOnly: false,
      sameSite: "None",
      secure: true,
      path: "/",
    });
    return res.status(200).json({ message: "Successfully logged out" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
export async function GetAllUser(req,res){
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { role, status, search } = req.query;

    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      const rx = searchRegex(search);
      query.$or = [{ name: rx }, { email: rx }];
    }

    const [users, total] = await Promise.all([
      User.find(query).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(query),
    ]);

    res.json(paginated(users, { page, limit, total }));
  } catch (error) {
    res.status(500).json({ message:error.message})
  }
}


export async function Approval(req, res) {
  try {
    const { userStatus, id } = req.params;
    const currentUserId = req.user._id;

    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role === "admin" || user.role === "superAdmin") {
      return res.status(400).json({ message: "Admins cannot be moderated" });
    }
    if (
      user.status === "suspended" &&
      user.suspendedBy &&
      user.suspendedBy.toString() !== currentUserId.toString()
    ) {
      return res.status(403).json({
        message: "Only the admin who suspended this user can approve/unsuspend them",
      });
    }

    const transitions = {
      approve: { status: "approved", suspendedBy: undefined, message: "User approved successfully!" },
      suspend: { status: "suspended", suspendedBy: currentUserId, message: "User suspended successfully!" },
      reject: { status: "rejected", suspendedBy: undefined, message: "User rejected successfully!" },
    };
    const transition = transitions[userStatus];
    if (!transition) {
      return res.status(400).json({ message: "Invalid action. Use 'approve', 'suspend' or 'reject'." });
    }

    user.status = transition.status;
    user.suspendedBy = transition.suspendedBy;
    await user.save();

    // Immediately evict from auth cache so status change takes effect on the next request
    invalidateUserCache(user._id);

    return res.status(200).json({ message: transition.message, user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}