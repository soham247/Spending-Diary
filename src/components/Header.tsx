"use client"
import React from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
// import { ModeToggle } from "./theme/ThemeToggler";
import { useAuthStore } from "@/store/Auth";
import { User, Settings, LogOut, BarChart3, Users, ArrowRight } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
    const { logout } = useAuthStore();
    const userId = "bdkjbjbajk"
    const router = useRouter();
    const { toast } = useToast();

    const navItems = [
        {
            name: "Expenses",
            icon: <BarChart3 size={16} />,
            link: "/expense",
            auth: true
        },
        {
            name: "Friends",
            icon: <Users size={16} />,
            link: "/friends",
            auth: true
        },
        {
            name: "About Us",
            link: "/about",
            auth: false
        },
        {
            name: "Pricing",
            link: "/pricing",
            auth: false
        },
        
    ]

    const handleLogout = async() => {
        try {
            const response = await axios.get('/api/users/logout');
            if(response.status === 200) {
                toast({
                    title: "Logout successful",
                    variant: "success",
                    duration: 3000
                });
                router.replace('/');
            }
            logout();
        } catch {
            toast({
                title: "Something went wrong",
                variant: "destructive",
                duration: 3000
            });
        }
    };

    return (
        <nav className="bg-transparent backdrop-blur-md border-b border-accent/10 w-[96vw] fixed top-0 z-50 px-4 md:px-8 py-3">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <Link href="/expense" className="font-bold font-sour_gummy text-xl bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                    Spending Diary
                </Link>
                
                <div className="hidden md:flex items-center space-x-8">
                    {navItems.filter((item) => (item.auth && userId !== null) || (!item.auth && userId === null)).map((item, index) => (
                        <Link key={index} href={item.link} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
                        {item.icon !== null && (
                            <span className="bg-primary/10 group-hover:bg-primary/20 p-1.5 rounded-md transition-colors text-primary">
                            {item.icon}
                        </span>
                        )}
                        <span>{item.name}</span>
                    </Link>
                    ))}
                </div>
                
                {/* Right Side Controls */}
                <div className="flex items-center gap-4">
                    {/* <ModeToggle /> */}
                    
                    {userId && (
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-blue-500/80 flex items-center justify-center cursor-pointer border-2 border-background shadow-lg hover:shadow-primary/20 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 focus:ring-offset-background">
                                <User size={18} className="text-white" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                                <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                                    <User size={16} />
                                    <span>Profile</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                                    <Settings size={16} />
                                    <span>Settings</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                className="text-destructive focus:text-destructive cursor-pointer"
                                onClick={handleLogout}
                            >
                                <div className="flex items-center gap-2">
                                    <LogOut size={16} />
                                    <span>Logout</span>
                                </div>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    )}

                    {!userId && (
                        <div>
                            <Link href="/login" className="px-4 py-2 text-primary transition-colors hover:text-primary/80 text-sm">
                                Sign in
                            </Link>
                            <Link href="/register" className="px-4 py-1.5 bg-primary text-white rounded-md hover:bg-primary/80 transition-colors text-sm">
                                Get Started <ArrowRight size={16} className="inline-block ml-1 mb-1" />
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}