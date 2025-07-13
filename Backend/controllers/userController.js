import bcrypt from 'bcryptjs';
import User from '../models/UserModel.js';
import { GenerateToken } from '../utils/GenerateToken.js';
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
          const user = await User.findOne({
            $or: [{ email: email }],
          });
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
          GenerateToken(newUser._id, newUser.role, res);
          await newUser.save();
    return res.status(200).json({ message: "successfully created new Admin" });
    res.status(500).json({ message: error.message });
    console.log(error);
    } catch (error) {
        
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
       const user = await User.findById(id);
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
    res.clearCookie("jwt", {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
    });
    return res.status(200).json({ message: "Successfully logged out" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
export async function GetAllUser(req,res){
  try {
    const user = await User.find({});
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
} catch (error) {
   res.status(500).json({ message:error.message})
}
}


export async function Approval(req, res) {
    const {userStatus ,id  } = req.params;
    const user = await User.findById(id).select("-password");
    const currentUser = req.user;
    const currentUserId = currentUser._id;
  
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
  
    if (user.role === "admin") {
      return res.status(400).json({ message: "Admins cannot be moderated" });
    }
    if (user.status === "suspended" && user.suspendedBy.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        message: "Only the admin who suspended this user can approve/unsuspend them",
      });
    }
    if (userStatus === "approve") {
      user.status = "approved";
      user.suspendedBy = undefined;
    } else if (userStatus === "suspend") {
      user.status = "suspended";
      user.suspendedBy = currentUserId;
    } else if(userStatus === "reject"){
      user.status = "rejected";
      user.suspendedBy = undefined;
    }
    else {
      return res.status(400).json({ message: "Invalid action. Use 'approve' or 'suspend'." });
    }
  
    await user.save();
  
    if (userStatus === "approve") {
      return res.status(200).json({
        message: "User approved successfully!",
        user,
      });
    } else if (userStatus === "reject") {
      return res.status(200).json({
        message: "User rejected successfully!",
        user,
      });
    } else {
      return res.status(200).json({
        message: "User suspended successfully!",
        user,
      });
    }
  }