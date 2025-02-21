import { getDataFromToken } from "@/helpers/getDataFromTokens";
import { NextRequest, NextResponse } from "next/server";
import { connect } from "@/dbConfig/dbConfig";
import User from "@/models/userModel";
import Expense from "@/models/expenseModel"

connect()

export const POST = async(request: NextRequest) => {
    try {
        const userId = await getDataFromToken(request);
        const user = await User.findById({_id: userId}).select("-password -phone");
        const reqBody = await request.json();
        const {tag, amount, note} = reqBody;

        const expense = new Expense({
            tag,
            amount,
            payerId: user._id,
            note
        })

        const savedExpense = await expense.save();

        if(!savedExpense) {
            return NextResponse.json({error: "Creating expense gone wrong"}, {status: 500})
        }

        user.expenses.push(savedExpense._id);
        const savedUser = await user.save();

        if(!savedUser) {
            return NextResponse.json({error: "Adding expense gone wrong"}, {status: 500})
        }

        return NextResponse.json({
            message: "Expense created successfully",
            success: true,
            data: savedExpense
        }, {status: 200})
    } catch {
        return NextResponse.json({error: "Something went wrong"}, {status: 500})
    }
}