import { getDataFromToken } from "@/helpers/getDataFromTokens";
import { NextRequest, NextResponse } from "next/server";
import User from "@/models/userModel";
import { connect } from "@/dbConfig/dbConfig";

connect()

export async function GET(request: NextRequest) {
    try {
        const userId = await getDataFromToken(request);
        const user = await User.findById({_id: userId}).select("-password");
        return NextResponse.json(
            {
                message: "User fetched successfully",
                success: true,
                data: user
            }, {status: 200}
        )
    } catch {
        return NextResponse.json({error: "Something went wrong"}, {status: 500})
    }
}