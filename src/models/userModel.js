import mongoose, { Schema } from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please add a name"],
        trim: true
    },
    phone: {
        type: String,
        required: [true, "Please add a phone number"],
        unique: true,
        trim: true,
        index: true
    },
    password: {
        type: String,
        required: [true, "Please add a password"],
        trim: true
    },
    expenses: {
        type: [Schema.Types.ObjectId],
        ref: "Expense"
    },
    friends: {
        type: [
            {
                userId: {
                    type: Schema.Types.ObjectId,
                    ref: "User"
                },
                amount: {
                    type: Number,
                    default: 0
                }
            }
        ],
        default: []
    },
    verifyToken: String
},
{ timestamps: true }
)

const User = mongoose.models.User || mongoose.model('User', userSchema)

export default User;