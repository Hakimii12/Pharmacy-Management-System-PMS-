import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['pharmacist', 'casher', 'manager'],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
const User = mongoose.model('user', userSchema);
export default User;