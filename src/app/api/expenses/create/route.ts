import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Friend } from "@prisma/client";

export const POST = async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reqBody = await request.json();
    const { tag, amount, note, payers } = reqBody as {
      tag: string;
      amount: number;
      note?: string;
      payers?: Array<{ userId: string; amount: number }>;
    };

    const effectivePayers = (payers && payers.length > 0)
      ? payers
      : [{ userId: currentUserId, amount }];

    // Create expense and related payers
    const savedExpense = await db.expense.create({
      data: {
        tag,
        amount,
        note: note ?? "",
        isSplitted: effectivePayers.length > 1,
        payers: {
          createMany: {
            data: effectivePayers.map((p) => ({ userId: p.userId, amount: p.amount })),
          },
        },
      },
      include: {
        payers: true,
      },
    });

    // If expense is split, update bilateral friend balances
    if (effectivePayers.length > 1) {
      for (const p of effectivePayers) {
        if (p.userId === currentUserId) continue;

        const friendId = p.userId;
        const friendAmount = p.amount;

        const friendship: Friend = (await db.friend.findMany({
          where: {OR: [{userId: currentUserId, friendId}, {userId: friendId, friendId: currentUserId}]},
        }))[0];

        if (friendship.userId === currentUserId ) {
          await db.friend.update({
            where: {userId_friendId: {userId: currentUserId, friendId}},
            data: {
              amount: {increment: friendAmount}
            }
          })
        } 
        else {
          await db.friend.update({
            where: {userId_friendId: {userId: friendId, friendId: currentUserId}},
            data: {
              amount: {decrement: friendAmount}
            }
          })
        }
      }
    }

    return NextResponse.json(
      {
        message: "Expense created successfully",
        success: true,
        data: savedExpense,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("Error creating expense:", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
};
