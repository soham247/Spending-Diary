import { connect } from "@/dbConfig/dbConfig";
import { getDataFromToken } from "@/helpers/getDataFromTokens";
import Expense from "@/models/expenseModel";
import { NextRequest, NextResponse } from "next/server";

connect();

export const GET = async (request: NextRequest) => {
  try {
    const userId = await getDataFromToken(request);

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }

    // const userWithExpenses = await User.findById(userId)
    //   .select("-password -phone")
    //   .populate({
    //     path: "expenses",
    //     model: Expense,
    //     options: {
    //       sort: { createdAt: -1 },
    //     },
    //   });

    const userWithExpenses = await Expense.find(
      { "payers.userId": userId }
    ).sort({ createdAt: -1 });
    

    if (!userWithExpenses) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: "User expenses fetched successfully",
        success: true,
        data: userWithExpenses,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch user expenses" },
      { status: 500 }
    );
  }
};
