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
        enum: ['pharmacist', 'casher', 'admin','superAdmin'],
        required: true
    },
    status: { 
        type: String, 
        enum: ['approved', 'pending', 'rejected', 'suspended'], 
        default: "pending" 
      },
      suspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;