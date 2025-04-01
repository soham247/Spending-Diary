"use client";

import { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, Loader2, Search, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  _id: string;
  name: string;
}

interface AddFriendsProps {
  onComplete?: () => void;
}

interface FriendStatus {
  [key: string]: "pending" | "added" | "error";
}

export default function AddFriends({ onComplete }: AddFriendsProps) {
  const [phone, setPhone] = useState<string>("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [friendStatus, setFriendStatus] = useState<FriendStatus>({});
  const [open, setOpen] = useState(false);

  // Clear state when dialog is closed
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setPhone("");
        setUsers([]);
        setError("");
        setSuccess("");
        setFriendStatus({});
      }, 200); // Small delay to avoid flashing during dialog close animation
    }
  }, [open]);

  const getUsersByPhone = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setUsers([]);
    
    try {
      setSearchLoading(true);

      if (!phone) {
        setError("Please enter a phone number");
        return;
      }

      const response = await axios.get("/api/users/getUser/phone", {
        params: { phone }
      });

      if (response.data.success) {
        if (response.data.data === null) {
          setError("No user found with this phone number");
        } else {
          setUsers([response.data.data]);
        }
      }
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        setError(error.response?.data?.message || "An error occurred while fetching users");
      } else {
        setError("An error occurred while fetching users");
      }
    } finally {
      setSearchLoading(false);
    }
  };

  const addFriend = async (userId: string) => {
    setFriendStatus(prev => ({ ...prev, [userId]: "pending" }));
    setError("");
    setSuccess("");
    
    try {
      const response = await axios.post("/api/friends/addFriend", {
        friendId: userId
      });
      
      if (response.data.success) {
        setSuccess("Friend added successfully");
        setFriendStatus(prev => ({ ...prev, [userId]: "added" }));
        
        // Wait a moment before closing the dialog
        setTimeout(() => {
          setOpen(false);
          if (onComplete) onComplete();
        }, 1500);
      } else {
        setError("Failed to add friend");
        setFriendStatus(prev => ({ ...prev, [userId]: "error" }));
      }
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        setError(error.response?.data?.message || "An error occurred while adding friend");
      } else {
        setError("An error occurred while adding friend");
      }
      setFriendStatus(prev => ({ ...prev, [userId]: "error" }));
    }
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
                placeholder="Enter phone number"
                className="flex-1"
              />
              <Button 
                type="submit"
                variant="default"
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
          <Alert className="mt-4 border-green-200 bg-green-50 text-green-700">
            <Check className="h-4 w-4 mr-2" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {searchLoading && (
          <div className="space-y-3 mt-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {!searchLoading && users.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Search Results</h2>
            <div className="space-y-2">
              {users.map((user) => (  
                <div 
                  key={user._id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border",
                    friendStatus[user._id] === "added" ? "bg-green-50 border-green-200" : "hover:bg-secondary/50"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10 bg-primary/10 text-primary">
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{phone}</p>
                    </div>
                  </div>
                  <Button
                    variant={friendStatus[user._id] === "added" ? "outline" : "default"}
                    size="sm"
                    disabled={friendStatus[user._id] === "pending" || friendStatus[user._id] === "added"}
                    onClick={() => addFriend(user._id)}
                    className={cn(
                      "transition-all duration-200",
                      friendStatus[user._id] === "added" && "border-green-200 text-green-700"
                    )}
                  >
                    {friendStatus[user._id] === "pending" && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    {friendStatus[user._id] === "added" ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Added
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        {friendStatus[user._id] === "pending" ? "Adding..." : "Add Friend"}
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No results but has searched */}
        {!searchLoading && users.length === 0 && error === "" && phone !== "" && (
          <div className="mt-6 text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
              <X className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No users found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Try searching with a different phone number
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}