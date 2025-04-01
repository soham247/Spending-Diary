import { getDataFromToken } from "@/helpers/getDataFromTokens";
import { NextRequest, NextResponse } from "next/server";
import { connect } from "@/dbConfig/dbConfig";
import User from "@/models/userModel";
import Expense from "@/models/expenseModel";
import mongoose from "mongoose";

connect();

interface Friend {
  userId: mongoose.Types.ObjectId;
  amount: number;
}

export const POST = async (request: NextRequest) => {
  try {
    const userId = await getDataFromToken(request);
    const user = await User.findById({ _id: userId }).select(
      "-password -phone"
    );
    const reqBody = await request.json();
    const { tag, amount, note, payers } = reqBody;
    console.log("backend", payers);
    
    // Create new expense
    const expense = new Expense({
      tag,
      amount,
      isSplitted: payers && payers.length > 1,
      payers: payers || [{ userId, amount }],
      note,
    });

    const savedExpense = await expense.save();

    if (!savedExpense) {
      return NextResponse.json(
        { error: "Creating expense gone wrong" },
        { status: 500 }
      );
    }
    
    
    // If expense is split, update balances and add expense to friends' expenses
    if (payers && payers.length > 1) {
      for(let i = 1; i < payers.length; i++) {
        const friendId = payers[i].userId;
        const friendAmount = payers[i].amount;
        
        const friend = await User.findById(friendId);
        if (!friend) {
          console.log(`Friend with ID ${friendId} not found`);
          continue;
        }
        
        // Update balances in both directions
        // Find current user in friend's friend list
        const currentUserInFriendsList = friend.friends?.find(
          (f: Friend) => f.userId.toString() === userId.toString()
        );
        
        if (currentUserInFriendsList) {
          currentUserInFriendsList.amount -= friendAmount; // Friend owes less to current user
        }
        
        // Find friend in current user's friend list
        const friendInUsersList = user.friends?.find(
          (f: Friend) => f.userId.toString() === friendId.toString()
        );
        
        if (friendInUsersList) {
          friendInUsersList.amount += friendAmount; // Friend owes more to current user
        }
        
        await friend.save();
      }
      
      // Save user again after all friend updates
      await user.save();
    }

    return NextResponse.json(
      {
        message: "Expense created successfully",
        success: true,
        data: savedExpense,
      },
      { status: 200 }
    );
  } catch {
    // console.log(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
};
