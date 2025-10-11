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

    const friendships = await db.friend.findMany(
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
          user: true,
          friend: true,
        },
      }
    )

    const data = friendships.map(friendship => {
      const isOwner = friendship.userId === userId;
      const friendData = isOwner ? friendship.friend : friendship.user;
      
      return {
        userId: {
          id: friendData.id,
          name: friendData.name,
          phone: friendData.phone,
        },
        friendId: friendship.id,
        amount: friendship.amount
      };
    });

    return NextResponse.json(
      {
        message: "Friends fetched successfully",
        success: true,
        data,
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
