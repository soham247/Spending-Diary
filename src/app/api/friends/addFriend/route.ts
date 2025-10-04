import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const POST = async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reqBody = await request.json();
    const friendId = reqBody.friendId as string;

    if (!friendId) {
      return NextResponse.json({ error: "friendId is required" }, { status: 400 });
    }

    // Ensure both users exist
    const [user, friend] = await Promise.all([
      db.user.findUnique({ where: { id: userId } }),
      db.user.findUnique({ where: { id: friendId } }),
    ]);

    if (!user || !friend) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create or ensure reciprocal friend links with zero balance
    await db.friend.upsert({
      where: { userId_friendId: { userId, friendId } },
      create: { userId, friendId, amount: 0 },
      update: {},
    });
    await db.friend.upsert({
      where: { userId_friendId: { userId: friendId, friendId: userId } },
      create: { userId: friendId, friendId: userId, amount: 0 },
      update: {},
    });

    return NextResponse.json(
      {
        message: "Friend added successfully",
        success: true,
        data: { userId, friendId },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
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
