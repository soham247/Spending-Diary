import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const GET = async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query parameters
    const url = new URL(request.url);
    const month = url.searchParams.get("month");
    const year = url.searchParams.get("year");
    const tag = url.searchParams.get("tag");

    // Build Prisma where clause
    const where: {
      payers: { some: { userId: string } };
      createdAt?: { gte: Date; lte: Date };
      tag?: string;
    } = {
      payers: { some: { userId } },
    };

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      where.createdAt = { gte: startDate, lte: endDate };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31);
      where.createdAt = { gte: startDate, lte: endDate };
    }

    if (tag && tag !== "All") {
      where.tag = tag;
    }

    const expenses = await db.expense.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        payers: true,
      },
    });

    return NextResponse.json(
      {
        message: "User expenses fetched successfully",
        success: true,
        data: expenses,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch user expenses" },
      { status: 500 }
    );
  }
};
