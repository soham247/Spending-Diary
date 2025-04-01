import { connect } from "@/dbConfig/dbConfig";
import { getDataFromToken } from "@/helpers/getDataFromTokens";
import User from "@/models/userModel";
import { NextRequest, NextResponse } from "next/server";

connect();

export const GET = async (request: NextRequest) => {
  try {
    const userId = await getDataFromToken(request);

    const user = await User.findById(userId)
      .select("friends")
      .populate("friends.userId", "name phone")
      .lean();
    if (!user) {
      return NextResponse.json(
        {
          message: "User not found",
          success: false,
          data: null,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Friends fetched successfully",
        success: true,
        data: user,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        message: "Failed to get friends",
        success: false,
        data: null,
      },
      { status: 500 }
    );
  }
};
