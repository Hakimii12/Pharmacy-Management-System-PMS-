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

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

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

        // Generate JWT
        GenerateToken(user._id, user.role, res);
        res.json( { id: user._id, name: user.name, email: user.email} );
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