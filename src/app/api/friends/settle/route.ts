import { connect } from "@/dbConfig/dbConfig";
import { getDataFromToken } from "@/helpers/getDataFromTokens";
import User from "@/models/userModel";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connect();

interface Friend {
  userId: mongoose.Types.ObjectId;
  amount: number;
}

export const POST = async (req: NextRequest) => {
    try {
        const userId = await getDataFromToken(req);
        const reqBody = await req.json();
        const friendId = reqBody.friendId;

        const user = await User.findById(userId).select("-password -phone");
        const friend = await User.findById(friendId).select("-password -phone");

        if (!user || !friend) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        user.friends?.find((f: Friend) => {
            if (f.userId.toString() === friendId) {
                f.amount = 0;
            }
        })

        friend.friends?.find((f: Friend) => {
            if (f.userId.toString() === userId) {
                f.amount = 0;
            }
        })

        const savedUser = await user.save();
        const savedFriend = await friend.save();

        if (!savedUser || !savedFriend) {
            return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
        }

        return NextResponse.json({ message: "Settled successfully", success: true }, { status: 200 });
        
    } catch (error) {
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
};