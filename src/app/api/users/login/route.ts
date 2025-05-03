import { connect } from "@/dbConfig/dbConfig";
import User from "@/models/userModel"
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

connect()

export async function POST(request: NextRequest) {
    try {
        const reqBody = await request.json()
        const {phone, password} = reqBody

        // check if user exists
        const user = await User.findOne({phone})

        if(!user) {
            return NextResponse.json({error: "User does not exist"}, {status: 400})
        }

        // check if password is correct
        const validPassword = await bcrypt.compare(password, user.password)

        if(!validPassword) {
            return NextResponse.json({error: "Incorrect password"}, {status: 400})
        }

        // create token data
        const tokenData = {
            id: user._id,
            name: user.name,
            phone: user.phone,
            isPremium: user.isPremium
        }

        // create token
        const token = await jwt.sign(tokenData, process.env.NEXT_TOKEN_SECRET!, {expiresIn: "1d"})
        const response = NextResponse.json({
            message: "Login successful",
            success: true,
            user: tokenData,
        }, {status: 200})

        response.cookies.set("token", token, {
            httpOnly: true,
        })
        return response
    } catch {
        return NextResponse.json({error: "Something went wrong"}, {status: 500})
    }
}