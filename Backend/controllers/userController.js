import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import User from "../models/UserModel.js";
import { GenerateToken } from "../utils/GenerateToken.js";
import { invalidateUserCache } from "../middlewares/Authenticated.js";
import { getPagination, paginated, searchLike } from "../utils/pagination.js";

// Register a new user
export async function RegisterUser(req, res) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Name, email, password, and role are required",
      });
    }

    if (role === "admin") {
      return res.status(403).json({
        message: "Admin registration is not allowed here",
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      status: "pending",
    });

    res.status(201).json({ message: "User registered successfully. Waiting for admin approval" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

export async function AdminRegister(req, res) {
  try {
    const { name, role, email, password } = req.body;
    if (role !== "admin") {
      return res.status(400).json({ message: `${role} cannot be registered by admin` });
    }
    if (!name || !role || !email || !password) {
      return res.status(400).json({ message: "please fill all the fields" });
    }
    const user = await User.findOne({ where: { email } });
    if (user) {
      return res.status(400).json({ message: "user already exists" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await User.create({
      name: name,
      role: "admin",
      email: email,
      password: hashedPassword,
      status: "approved",
    });

    return res.status(201).json({
      message: "successfully created new Admin",
      user: {
        id: newUser.id,
        _id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Sign in user
export async function LoginUser(req, res) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    if (user.status !== "approved") {
      return res.status(400).json("Account pending approval");
    }

    const token = GenerateToken(user.id, user.role, res);
    res.json({ id: user.id, _id: user.id, name: user.name, email: user.email, role: user.role, token });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

export async function GetUser(req, res) {
  try {
    const id = req.params.id;
    const user = await User.findByPk(id, { attributes: { exclude: ["password"] } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ id: user.id, _id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function Logout(req, res) {
  try {
    const isSecure = process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";
    res.clearCookie("jwt", {
      httpOnly: true,
      sameSite: isSecure ? "none" : "lax",
      secure: isSecure,
      path: "/",
    });
    return res.status(200).json({ message: "Successfully logged out" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function GetAllUser(req, res) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { role, status, search } = req.query;

    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      const rx = searchLike(search);
      where[Op.or] = [{ name: { [Op.like]: rx } }, { email: { [Op.like]: rx } }];
    }

    const { rows: users, count: total } = await User.findAndCountAll({
      where,
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
      offset: skip,
      limit,
    });

    res.json(paginated(users, { page, limit, total }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function Approval(req, res) {
  try {
    const { userStatus, id } = req.params;
    const currentUserId = req.user.id || req.user._id;

    const user = await User.findByPk(id, { attributes: { exclude: ["password"] } });
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
      approve: { status: "approved", suspendedBy: null, message: "User approved successfully!" },
      suspend: { status: "suspended", suspendedBy: currentUserId, message: "User suspended successfully!" },
      reject: { status: "rejected", suspendedBy: null, message: "User rejected successfully!" },
    };
    const transition = transitions[userStatus];
    if (!transition) {
      return res.status(400).json({ message: "Invalid action. Use 'approve', 'suspend' or 'reject'." });
    }

    user.status = transition.status;
    user.suspendedBy = transition.suspendedBy;
    await user.save();

    invalidateUserCache(user.id);

    return res.status(200).json({ message: transition.message, user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}