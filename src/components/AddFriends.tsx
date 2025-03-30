"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import axios, { AxiosError } from "axios"
import { Check, Loader2, Plus, Search, UserPlus } from "lucide-react"
import React, { useState } from "react"

interface User {
    _id: string
    name: string
}

interface FriendStatus {
    [key: string]: "pending" | "added" | "error"
}

export default function AddFriends() {
    const [phone, setPhone] = useState<string>("")
    const [searchLoading, setSearchLoading] = useState(false)
    const [users, setUsers] = useState<User[]>([])
    const [error, setError] = useState<string>("")
    const [success, setSuccess] = useState<string>("")
    const [friendStatus, setFriendStatus] = useState<FriendStatus>({})

    const getUsersByPhone = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError("")
        setSuccess("")
        setUsers([])
        
        try {
            setSearchLoading(true)

            if(!phone) {
                setError("Please enter a phone number")
                return
            }

            const response = await axios.get('/api/users/getUser/phone', {
                params: { phone }
            })

            if(response.data.success) {
                if(response.data.data === null) {
                    setError("No user found with this phone number")
                } else {
                    setUsers([response.data.data])
                }
            }
        } catch (error: unknown) {
            if(error instanceof AxiosError) {
                setError(error.response?.data?.message || "An error occurred while fetching users")
            } else {
                setError("An error occurred while fetching users")
            }
        } finally {
            setSearchLoading(false)
        }
    }

    const addFriend = async (userId: string) => {
        setFriendStatus(prev => ({ ...prev, [userId]: "pending" }))
        setError("")
        setSuccess("")
        
        try {
            const response = await axios.post('/api/friends/addFriend', {
                friendId: userId
            })
            
            if(response.data.success) {
                setSuccess("Friend added successfully")
                setFriendStatus(prev => ({ ...prev, [userId]: "added" }))
            } else {
                setError("Failed to add friend")
                setFriendStatus(prev => ({ ...prev, [userId]: "error" }))
            }
        } catch (error: unknown) {
            if(error instanceof AxiosError) {
                setError(error.response?.data?.message || "An error occurred while adding friend")
            } else {
                setError("An error occurred while adding friend")
            }
            setFriendStatus(prev => ({ ...prev, [userId]: "error" }))
        }
    }

    return (
        <div>
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Friend
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">Add Friend</DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={getUsersByPhone} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <div className="flex space-x-2">
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                    placeholder="Enter your friend's phone number"
                                    className="flex-1"
                                />
                                <Button 
                                    type="submit"
                                    disabled={searchLoading}
                                >
                                    {searchLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Search className="h-4 w-4 mr-2" />
                                    )}
                                    Search
                                </Button>
                            </div>
                        </div>
                    </form>

                    {/* Status Messages */}
                    {error && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    
                    {success && (
                        <Alert className="mt-4 bg-green-50 text-green-700 border-green-200">
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    )}

                    {/* Loading State */}
                    {searchLoading && (
                        <div className="space-y-3 mt-4">
                            <Skeleton className="h-12 w-full rounded-md" />
                        </div>
                    )}

                    {/* Results */}
                    {!searchLoading && users.length > 0 && (
                        <div className="mt-6">
                            <h2 className="text-lg font-semibold mb-3">Users found:</h2>
                            <div className="border rounded-lg overflow-hidden">
                                {users.map((user) => (  
                                    <div 
                                        key={user._id}
                                        className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50"
                                    >
                                        <p className="font-medium">{user.name}</p>
                                        <Button
                                            variant={friendStatus[user._id] === "added" ? "outline" : "default"}
                                            size="sm"
                                            disabled={friendStatus[user._id] === "pending" || friendStatus[user._id] === "added"}
                                            onClick={() => addFriend(user._id)}
                                            className="transition-all duration-200"
                                        >
                                            {friendStatus[user._id] === "pending" && (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            )}
                                            {friendStatus[user._id] === "added" ? (
                                                <>
                                                    <Check className="h-4 w-4 mr-2 text-green-500" />
                                                    Added
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    {friendStatus[user._id] === "pending" ? "Adding..." : "Add"}
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}