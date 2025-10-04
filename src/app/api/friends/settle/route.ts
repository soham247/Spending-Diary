import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const POST = async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reqBody = await req.json();
    const friendId = reqBody.friendId as string;

    // Ensure both records exist; set amounts to 0
    await db.friend.upsert({
      where: { userId_friendId: { userId, friendId } },
      create: { userId, friendId, amount: 0 },
      update: { amount: 0 },
    });
    await db.friend.upsert({
      where: { userId_friendId: { userId: friendId, friendId: userId } },
      create: { userId: friendId, friendId: userId, amount: 0 },
      update: { amount: 0 },
    });

    return NextResponse.json({ message: "Settled successfully", success: true }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
};
