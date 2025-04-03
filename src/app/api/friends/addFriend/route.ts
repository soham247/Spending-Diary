import { connect } from "@/dbConfig/dbConfig";
import { getDataFromToken } from "@/helpers/getDataFromTokens";
import User from "@/models/userModel";
import { NextRequest, NextResponse } from "next/server";

connect();

export const POST = async (request: NextRequest) => {
  try {
    const reqBody = await request.json();
    const friendId = reqBody.friendId;

    const userId = await getDataFromToken(request);

    const user = await User.findById({ _id: userId }).select(
      "-password -phone"
    );
    const friend = await User.findById({ _id: friendId }).select(
      "-password -phone"
    );
    if (user && friend) {
      user.friends?.push({
        userId: friendId,
        amount: 0,
      });
      friend.friends?.push({
        userId: userId,
        amount: 0,
      });
    }

    const savedUser = await user.save();
    const savedFriend = await friend.save();

    if (!savedUser || !savedFriend) {
      return NextResponse.json(
        {
          message: "Failed to add friend",
          success: false,
          data: null,
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        message: "Friend added successfully",
        success: true,
        data: savedUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        message: "Failed to add friend",
        success: false,
        data: null,
      },
      { status: 500 }
    );
  }
};
