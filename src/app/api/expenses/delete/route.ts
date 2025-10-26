import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Friend } from "@prisma/client";

export const DELETE = async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expenseId = request.nextUrl.searchParams.get("id");
    if (!expenseId) {
      return NextResponse.json(
        { error: "Expense ID is required" },
        { status: 400 }
      );
    }

    const expense = await db.expense.findUnique({
      where: { id: expenseId },
      include: { payers: true },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    if (expense.payers && expense.payers.length > 1) {
      for (const p of expense.payers) {
        if (p.userId === currentUserId) continue;
        const friendId = p.userId;
        const friendAmount = p.amount;

        // Reverse the earlier increments/decrements
        const friendship: Friend = (
          await db.friend.findMany({
            where: {
              OR: [
                { userId: currentUserId, friendId },
                { userId: friendId, friendId: currentUserId },
              ],
            },
          })
        )[0];

        if (friendship.userId === currentUserId) {
          await db.friend.update({
            where: { userId_friendId: { userId: currentUserId, friendId } },
            data: {
              amount: { decrement: friendAmount },
            },
          });
        } else {
          await db.friend.update({
            where: {
              userId_friendId: { userId: friendId, friendId: currentUserId },
            },
            data: {
              amount: { increment: friendAmount },
            },
          });
        }
      }
    }

    await db.payer.deleteMany({ where: { expenseId } });
    await db.expense.delete({ where: { id: expenseId } });

    return NextResponse.json(
      { message: "Expense deleted successfully", success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
};
