import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
        const data = await getServerSession(authOptions)

        // Your Razorpay secret key (store in .env file)
        const secret = process.env.RAZORPAY_SECRET!;

        // Create signature to verify
        const generated_signature = crypto
            .createHmac('sha256', secret)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        // Compare signatures
        if (generated_signature === razorpay_signature) {
            // Payment is verified
            await db.user.update({
                where: { id: data?.user.id },
                data: { isPremium: true }
            })
            
            console.log('Payment verified successfully:', {
                order_id: razorpay_order_id,
                payment_id: razorpay_payment_id
            });

            return NextResponse.json({
                success: true,
                message: 'Payment verified successfully',
                payment_id: razorpay_payment_id,
                order_id: razorpay_order_id
            });
        } else {
            // Signature doesn't match
            console.error('Signature verification failed');
            return NextResponse.json({
                success: false,
                message: 'Invalid signature'
            }, { status: 400 });
        }
    } catch (error) {
        console.error('Verification error:', error);
        return NextResponse.json({
            success: false,
            message: 'Verification failed'
        }, { status: 500 });
    }
}