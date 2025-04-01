import { connect } from "@/dbConfig/dbConfig";
import { getDataFromToken } from "@/helpers/getDataFromTokens";
import Expense from "@/models/expenseModel";
import User from "@/models/userModel";
import { Friend } from "@/types/friend";
import { NextRequest } from "next/server";

connect();

export const DELETE = async ( request: NextRequest) => {
  try {
    const expenseId = request.nextUrl.searchParams.get("id");
    const userId = await getDataFromToken(request);
    const user = await User.findById({ _id: userId }).select(
      "-password -phone"
    );

    if (!expenseId) {
      return Response.json(
        { error: "Expense ID is required" },
        { status: 400 }
      );
    }
    const deletedExpense = await Expense.findByIdAndDelete(expenseId);

    if (!deletedExpense) {
      return Response.json({ error: "Expense not found" }, { status: 404 });
    }

    if (deletedExpense.payers && deletedExpense.payers.length > 1) {
          for(let i = 1; i < deletedExpense.payers.length; i++) {
            const friendId = deletedExpense.payers[i].userId;
            const friendAmount = deletedExpense.payers[i].amount;
            
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
              currentUserInFriendsList.amount += friendAmount; // Reverse the deduction
            }
            
            // Find friend in current user's friend list
            const friendInUsersList = user.friends?.find(
              (f: Friend) => f.userId.toString() === friendId.toString()
            );
            
            if (friendInUsersList) {
              friendInUsersList.amount -= friendAmount; // Reverse the addition
            }
            
            await friend.save();
          }
          
          // Save user again after all friend updates
          await user.save();
        }

    return Response.json(
      { message: "Expense deleted successfully", success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting expense:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
