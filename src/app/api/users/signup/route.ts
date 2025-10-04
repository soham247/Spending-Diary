import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
    try {
        const reqBody = await request.json();
        const { name, phone, password } = reqBody;

        // check if user already exists
        const user = await db.user.findUnique({ where: { phone } });
        if(user) {
            return NextResponse.json({error: "User already exists"}, {status: 400})
        }

        // hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // create user
        const newUser = {
            name,
            phone,
            password: hashedPassword
        };

        const savedUser = await db.user.create({ data: newUser });

        return NextResponse.json(
            {
                message: "User created successfully",
                success: true,
                savedUser
            }, { status: 200 }
        )
    } catch{
        return NextResponse.json({error: "Something went wrong" }, {status: 500})
    }
}
