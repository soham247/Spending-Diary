import { connect } from "@/dbConfig/dbConfig";
import { getDataFromToken } from "@/helpers/getDataFromTokens";
import Expense from "@/models/expenseModel";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connect();

// Define a proper type for the query
interface ExpenseQuery {
  "payers.userId": string | mongoose.Types.ObjectId;
  createdAt?: {
    $gte: Date;
    $lte: Date;
  };
  tag?: string;
}

export const GET = async (request: NextRequest) => {
  try {
    const userId = await getDataFromToken(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const url = new URL(request.url);
    const month = url.searchParams.get("month");
    const year = url.searchParams.get("year");
    const tag = url.searchParams.get("tag");
    
    const query: ExpenseQuery = { "payers.userId": userId };
    
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      
      query.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31);
      
      query.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    if (tag && tag !== "All") {
      query.tag = tag;
    }
    
    const userWithExpenses = await Expense.find(query)
      .limit(50)
      .sort({ createdAt: -1 });
    
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
  } catch (error) {
    console.error("Error fetching user expenses:", error);
    return NextResponse.json(
      { error: "Failed to fetch user expenses" },
      { status: 500 }
    );
  }
};