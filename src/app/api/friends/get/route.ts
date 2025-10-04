import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Friend } from "@/types/friend";

export const GET = async () => {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized", success: false, data: null }, { status: 401 });
    }

    const links = await db.friend.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    const friendIds = links.map((f: { friendId: string }) => f.friendId);
    const friendUsers = await db.user.findMany({
      where: { id: { in: friendIds } },
      select: { id: true, name: true, phone: true },
    });

    const userMap = new Map(friendUsers.map((u) => [u.id, u]));

    const data = links.map((l) => ({
      userId: { _id: l.friendId, name: userMap.get(l.friendId)?.name ?? "", phone: userMap.get(l.friendId)?.phone ?? "" },
      amount: l.amount,
    }));

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
