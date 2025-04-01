"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useState } from "react";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/Auth";

export default function LoginPage() {
    const { login } = useAuthStore()
    const { toast } = useToast()
    const router = useRouter()
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const phone = formData.get("phone")
        const password = formData.get("password")

        if (!phone || !password) {
            setError("All fields are required")
            return
        }

        setError("")
        try {
            setLoading(true)
            const response = await axios.post("/api/users/login", {phone, password})
            if(response.status === 200) {
                login(response.data.user.id)
                toast({
                    title: "Login successful",
                    variant: "success",
                    duration: 2000
                })
                router.push("/expense")
            } else if(response.status === 400) {
                setError(response.data.message)
            }
        } catch(error: unknown) {
            if(error instanceof AxiosError)
            toast({
                title: error.response?.data.error,
                variant: "destructive",
                duration: 3000
            })
            else
            toast({
                title: "Something went wrong",
                variant: "destructive",
                duration: 3000
            })
        } finally {
            setLoading(false)
        }
    }
    return (
        <div className="mx-auto w-full max-w-md rounded-none border border-solid border-white/30 bg-white p-4 shadow-input dark:bg-black md:rounded-2xl md:p-8">
            <h2 className="text-4xl text-center font-bold text-neutral-800 dark:text-neutral-200">Login</h2>
            {error && (
                <p className="my-4 text-center text-red-500">{error}</p>
            )}
            <form onSubmit={handleSubmit}>
                <Label htmlFor="phone">Phone</Label>
                <Input
                    className="mb-4"
                    id="phone"
                    name="phone"
                    type="text"
                    placeholder="Phone"
                />

                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Password"
                />

                <p className="mt-4 text-center text-muted-foreground">Don&apos;t have an account? <Link href={"/register"}
                className="hover:underline text-foreground"
                >Sign up</Link></p>

                <button 
                    className="mt-4 w-full rounded-lg bg-primary px-4 py-2 text-base font-semibold leading-7 text-white hover:bg-primary-focus dark:bg-primary dark:hover:bg-primary-focus"
                    type="submit"
                    disabled={loading}
                >{loading ? "Processing..." : "Login"}</button>
            </form>
        </div>
    )
}
