"use client"
import React from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { ModeToggle } from "./theme/ThemeToggler";
import { useAuthStore } from "@/store/Auth";

export default function Header() {
    const { logout } = useAuthStore() 
    const router = useRouter()
    const {toast} = useToast()
    const handleLogout = async() => {
        try {
            const response = await axios.get('/api/users/logout')
            if(response.status === 200) {
                toast({
                    title: "Logout successful",
                    variant: "success",
                    duration: 3000
                })
                router.push('/')
            }
            logout()
        } catch{
            toast({
                title: "Something went wrong",
                variant: "destructive",
                duration: 3000
            })
        }
    }
    return (
        <nav className="flex justify-center gap-3 items-center shadow-sm px-6 py-2 font-semibold">
            <Link href={'/expense'} className={``}>Expenses</Link>
            <Link href={'/friends'} className="">Friends</Link>
            <Link href={'/profile'} className="">Profile</Link>
            <ModeToggle />
            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">Logout</button>
        </nav>
    )
}