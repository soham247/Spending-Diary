"use client"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function RegisterPage() {
    const {toast} = useToast()
    const router = useRouter()
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string
        const phone = formData.get("phone")
        const password = formData.get("password") as string
        const confirmPassword = formData.get("confirm-password") as string

        if (!name || !phone || !password || !confirmPassword) {
            setError("All fields are required")
            return
        } 

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        if(password.length < 8) {
            setError("Password must be at least 8 characters")
            return
        }

        setError("")
        try {
            setLoading(true) 
            const response = await axios.post("/api/users/signup", {name, phone, password})
            if(response.status === 200) {
                toast({
                    title: "Registration successful",
                    description: "Please login to continue",
                    variant: "success",
                    duration: 3000
                })
                router.push("/login")
            } else if(response.status === 400) {
                setError(response.data.message)
            }
        } catch{           
            toast({
                title: "Something went wrong",
                variant: "destructive",
                duration: 3000
            })           
        } finally {
            setLoading(false)
        }
    }

    return(
        <div className="mx-auto w-full max-w-md rounded-none border border-solid border-white/30 bg-white p-4 shadow-input dark:bg-black md:rounded-2xl md:p-8">
            <h2 className="text-4xl text-center font-bold text-neutral-800 dark:text-neutral-200">Sign up</h2>
            {error && (
                <p className="text-red-500 my-4 text-center">{error}</p>
            )}

            <form onSubmit={handleSubmit}>
                <Label htmlFor="name">Name</Label>
                <Input
                    className="mb-4"
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Name"
                />

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
                className="mb-4"
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Password"
                />

                <Label htmlFor="password">Confirm Password</Label>
                <Input
                    className="mb-4"
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    placeholder="Confirm Password"
                />

                <p className="mt-4 text-center text-muted-foreground">Already have an account? <Link href={"/login"} className="underline text-foreground">Login</Link></p>

                <button
                type="submit"
                className="mt-4 w-full rounded-lg bg-primary px-4 py-2 text-base font-semibold leading-7 text-white hover:bg-primary-focus dark:bg-primary dark:hover:bg-primary-focus"
                disabled={loading}
                >{loading ? "Processing..." : "Sign up"}</button>
            </form>
        </div>
    )
}