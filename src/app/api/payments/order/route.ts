import { razorpayInstance } from "@/lib/razorpay"
import { NextResponse } from "next/server"

export const POST = async () => {
    try {
        const order = await razorpayInstance.orders.create({
            amount: 7900,
            currency: "INR",
            receipt: `ReSP-${Math.random().toString(36).substring(2, 10)}-${Date.now()}`,
        })

        if (!order || !order.id) {
            return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
        }

        return NextResponse.json(
            { orderId: order.id, amount: order.amount, currency: order.currency },
            { status: 200 }
        )
    } catch {
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
    }
}