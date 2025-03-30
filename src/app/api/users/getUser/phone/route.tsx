import { connect } from "@/dbConfig/dbConfig";
import User from "@/models/userModel";
import { NextRequest, NextResponse } from "next/server";

connect();

export const GET = async (request: NextRequest) => {
  try {
    const phone = request.nextUrl.searchParams.get("phone");

    const user = await User.findOne({ phone: phone }).select("-password -phone -__v -expenses -friends -createdAt -updatedAt");

    if (!user) {
      return NextResponse.json(
        {
          message: "User not found",
          success: true,
          data: null,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "User fetched successfully",
        success: true,
        data: user,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        message: "Failed to fetch user",
        success: false,
        data: null,
      },
      { status: 500 }
    );
  }
};
