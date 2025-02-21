import { connect } from "@/dbConfig/dbConfig";
import Expense from "@/models/expenseModel";
import { NextRequest } from "next/server";

connect();

export const DELETE = async( request: NextRequest, { params }: { params: { id: string } }
) => {
  try {
    const { id: expenseId } = params;
    console.log("Expense ID:", expenseId);
    
    if (!expenseId) {
      return Response.json(
        { error: "Expense ID is required" },
        { status: 400 }
      );
    }
    const deletedExpense = await Expense.findByIdAndDelete(expenseId);

    if (!deletedExpense) {
      return Response.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }
    return Response.json(
      { message: "Expense deleted successfully", success: true },
      { status: 200 }
    );
  } catch {
    return Response.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}