import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name:{type: String, required: true, trim: true},
        email:{type: String, requeried: true, trim: true, unique: true, lowercase: true},
        password:{type: String, requeried: true, trim: true},

        pushSubscription: {
            type: Object,
            default: null
        }
    },
    {
        timestamps: true,
    }
);

export default mongoose.model('User', userSchema);