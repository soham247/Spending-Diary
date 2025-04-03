"use client";

import { useEffect, useState } from "react";
import axios, { AxiosError } from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { UserPlus, RefreshCw, UserX } from "lucide-react";
import AddFriends from "@/components/AddFriends";
import { Friend } from "@/types/friend";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddFriends, setShowAddFriends] = useState<boolean>(false);
  const { toast } = useToast()

  const getFriends = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/friends/get");

      if (response.data.success) {
        setFriends(response.data.data.friends);
      } else {
        setError("Failed to fetch friends");
      }
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        setError(error.response?.data.error);
      }
      setError("An error occurred while fetching friends");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getFriends();
  }, []);

  const settleBalance = async (friendId: string) => {
    try {
      const response = await axios.post("/api/friends/settle", { friendId });
      if (response.data.success) {
        toast({
          variant: "success",
          title: "Success",
          description: "Balance settled successfully",
        })
        getFriends();
      }
    } catch  {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong while settling balance",
      })
    }    
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Friends</CardTitle>
            <CardDescription>Manage your friends and balances</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => getFriends()}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowAddFriends(!showAddFriends)}
              className="flex items-center gap-1"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Friend</span>
            </Button>
          </div>
        </CardHeader>

        {showAddFriends && (
          <CardContent className="pt-0 pb-4">
            <AddFriends
              onComplete={() => {
                setShowAddFriends(false);
                getFriends();
              }}
            />
          </CardContent>
        )}
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : friends.length === 0 ? (
        <Card className="border-dashed border-2 p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="rounded-full bg-secondary p-4">
              <UserX className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg">No friends yet</h3>
            <p className="text-muted-foreground">
              Add your first friend to get started
            </p>
            <Button
              variant="default"
              onClick={() => setShowAddFriends(true)}
              className="mt-2"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Friend
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {friends.map((friend) => (
            <Card key={friend.userId._id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{friend.userId.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {friend.userId.phone}
                    </p>
                  </div>
                  <div
                    className={`font-semibold ${
                      friend.amount > 0
                        ? "text-orange-600"
                        : friend.amount < 0
                        ? "text-red-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {friend.amount > 0 ? "+" : ""}
                    {friend.amount}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost">Settle Balance</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will settle the balance between you and{" "}
                          {friend.userId.name} and connot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => settleBalance(friend.userId._id)}>Settle Balance</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
