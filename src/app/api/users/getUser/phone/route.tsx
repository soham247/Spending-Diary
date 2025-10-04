import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const GET = async (request: NextRequest) => {
  try {
    const phone = request.nextUrl.searchParams.get("phone");

    if (!phone) {
      return NextResponse.json({ message: "phone is required", success: false, data: null }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { phone }, select: { id: true, name: true } });

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
    console.error(error);
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
