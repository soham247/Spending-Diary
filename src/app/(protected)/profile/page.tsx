"use client";
import axios, { AxiosError } from "axios";
import React, { useEffect, useState } from "react";

interface User {
    name: string;
    phone: string;
    friends: string[];
}

export default function ProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true); 
    const [error, setError] = useState<string | null>(null);

    const getUser = async () => {
        try {
            const response = await axios.get("/api/users/currentUser");
            setUser(response.data?.data);
            console.log(response.data);
        } catch (error: unknown) {
            if(error instanceof AxiosError) {
                setError(error.response?.data.error);
            } else {
                setError("Something went wrong");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getUser();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="w-[50%] mx-auto text-center mt-5">
            { error && <p className="text-red-500">{error}</p>}
            <h2 className="text-3xl">{user?.name || "Guest"}</h2>
            <h3 className="text-xl">{user?.phone || "912xxxx874"}</h3>
            <div className="mt-5">
                <h3>{user?.friends?.length || '0'} Friends</h3>
            </div>
        </div>
    );
}
