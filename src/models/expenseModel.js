import mongoose, { Schema } from "mongoose";

const expenseSchema = new mongoose.Schema({
    tag: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    payerId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    isSplitted: {
        type: Boolean,
        default: false
    },
    splitUsers: {
        type: [Schema.Types.ObjectId],
        ref: "User"
    },
    note: {
        type: String
    }
},
    { timestamps: true }
)

const Expense = mongoose.models.Expense || mongoose.model("Expense", expenseSchema)

export default Expense