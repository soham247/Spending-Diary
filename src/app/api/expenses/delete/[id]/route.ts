import { connect } from "@/dbConfig/dbConfig";
import Expense from "@/models/expenseModel";
import { NextRequest } from "next/server";

connect();

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<Response> {
  try {
    const { id: expenseId } = context.params;
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
  } catch (error) {
    console.error("Error deleting expense:", error);
    return Response.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}