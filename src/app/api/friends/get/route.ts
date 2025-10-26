import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const GET = async () => {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized", success: false, data: null }, { status: 401 });
    }

    const friends = await db.friend.findMany(
      {
        where: {
          OR: [
            {
              userId: userId,
            },
            {
              friendId: userId,
            },
          ],
        },
        include: {
          user: {
            select: {
              name: true,
              phone: true,
            },
          },
          friend: {
            select: {
              name: true,
              phone: true,
            },
          },
        },
      }
    )

    return NextResponse.json(
      {
        message: "Friends fetched successfully",
        success: true,
        friends,
      },
      { status: 200 }
    );
  } catch {
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
