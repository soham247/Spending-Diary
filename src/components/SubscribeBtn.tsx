'use client'

import { ArrowRight } from "lucide-react"
import { Button } from "./ui/button"
import axios, { AxiosError } from "axios"
import { toast } from "@/hooks/use-toast"
import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

function SubscribeBtn() {
    const router = useRouter()
    const {data, update} = useSession()
    
    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const paymentHandler = async () => {
        try {
            const response = await axios.post('/api/payments/order');
            const { amount, currency, orderId } = response.data;
            
            // Validate required fields
            const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY;
            if (!razorpayKey) {
                throw new Error('Razorpay key is not configured');
            }
            
            const userName = data?.user?.name || 'Guest';
            const userPhone = data?.user?.phone || '';

            const options = {
                key: razorpayKey,
                amount: amount,
                currency: currency,
                name: 'Spending Diary Pro',
                description: 'Test Transaction',
                order_id: orderId,
                callback_url: `${process.env.NEXT_APP_URL}/expense`,
                prefill: {
                    name: userName,
                    email: 'sohamsadhukhan247@gmail.com',
                    contact: userPhone
                },
                theme: {
                    color: '#F97316'
                },
                handler: async function (response: RazorpayPaymentResponse) {
                    try {
                        console.log('Payment successful:', response);
                        
                        const verifyResponse = await axios.post('/api/payments/validate', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });

                        if (verifyResponse.data.success) {
                            toast({
                                title: "Payment Successful!",
                                description: "Your subscription has been activated.",
                                duration: 3000,
                            });
                            update({ ...data, user: { ...data?.user, isPremium: true } });
                            router.push('/expense');
                        } else {
                            toast({
                                title: "Payment Verification Failed",
                                description: "Please contact support.",
                                variant: "destructive",
                                duration: 3000,
                            });
                        }
                    } catch (error) {
                        console.error('Verification error:', error);
                        toast({
                            title: "Verification Failed",
                            description: "Payment received but verification failed. Please contact support.",
                            variant: "destructive",
                            duration: 5000,
                        });
                    }
                },
                modal: {
                    ondismiss: function() {
                        console.log('Payment modal closed');
                        toast({
                            title: "Payment Cancelled",
                            description: "You closed the payment window.",
                            duration: 3000,
                        });
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch(error: unknown) {
            if (error instanceof AxiosError) {
                toast({
                    title: "Something went wrong",
                    variant: "destructive",
                    duration: 3000,
                })
            } else if (error instanceof Error) {
                toast({
                    title: error.message,
                    variant: "destructive",
                    duration: 3000,
                })
            }
        }
    }

    return (
        <Button
            variant='ghost'
            onClick={paymentHandler}
        >
            Subscribe <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
    )
}

export default SubscribeBtn