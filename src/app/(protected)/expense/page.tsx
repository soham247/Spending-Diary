"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import UserExpenses from "@/components/UserExpenses";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import axios, { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Friend } from "@/types/friend";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/store/Auth";

export default function ExpensePage() {
  const { userId } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [split, setSplit] = useState<boolean>(false);
  const [fetchingFriends, setFetchingFriends] = useState<boolean>(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<{[key: string]: boolean}>({});

  const tags = ["Food", "Grocery", "Transport", "Medical", "Fruits", "Bills", "Rent", "Entertainment", "Other"];

  const refreshExpenses = () => {
    setRefresh((prev) => !prev);
  };

  const getFriends= async () => {
    try {
      setFetchingFriends(true);
      const response = await axios.get("/api/friends/get");
      setFriends(response.data.data.friends);
      
      // Initialize selectedFriends state with all friends unchecked
      const friendsState: {[key: string]: boolean} = {};
      response.data.data.friends.forEach((friend: Friend) => {
        friendsState[friend.userId._id] = false;
      });
      setSelectedFriends(friendsState);
      
    } catch (error: unknown) {
      if(error instanceof AxiosError) {
        setError(error.response?.data.error);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setFetchingFriends(false);
    }
  }

  useEffect(() => {    
    if(split === true && friends.length === 0) {
      getFriends();
    }
  }, [split, friends]);

  const handleFriendToggle = (friendId: string) => {
    setSelectedFriends(prev => ({
      ...prev,
      [friendId]: !prev[friendId]
    }));
  };

  const addExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get("amount") as string);
    const note = formData.get("note");

    if (!selectedTag) {
      setError("Please select a category.");
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setError("");
    try {
      setLoading(true);
      
      const payers = [];
      
      if (split) {
        // Get all selected friends
        const selectedFriendIds = Object.entries(selectedFriends)
          .filter(([, isSelected]) => isSelected)
          .map(([id]) => id);
        
        // If no friends are selected, handle error
        if (selectedFriendIds.length === 0) {
          setError("Please select at least one friend to split with.");
          setLoading(false);
          return;
        }
        
        // Calculate split amount - total participants includes the user + selected friends
        const totalParticipants = selectedFriendIds.length + 1;
        const splitAmount = parseFloat((amount / totalParticipants).toFixed(2));
        
        // Add current user to payers
        payers.push({ userId: userId, amount: splitAmount });
        
        // Add selected friends to payers
        selectedFriendIds.forEach(friendId => {
          payers.push({ userId: friendId, amount: splitAmount });
        });
      } else {
        // If not split, just add the current user with full amount
        payers.push({ userId: userId, amount: amount });
      }
      console.log("Payers:", payers);
      
      await axios.post("/api/expenses/create", {
        amount,
        tag: selectedTag,
        payers,
        note,
      });
      
      // Reset form
      (e.target as HTMLFormElement).reset();
      setSelectedTag(null);
      if (split) {
        // Reset selected friends
        const resetFriends: {[key: string]: boolean} = {};
        Object.keys(selectedFriends).forEach(key => {
          resetFriends[key] = false;
        });
        setSelectedFriends(resetFriends);
      }
      
      refreshExpenses();
    } catch (error) {
      setError("Failed to add expense. Please try again.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-2 md:px-8 py-8 max-w-7xl">
      <div className="grid gap-8 md:grid-cols-[350px,1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-sour_gummy">Add New Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addExpense} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    name="amount"
                    placeholder="Enter amount"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                {/* Tag Selection */}
                <div className="space-y-2">
                  <Label htmlFor="tag">Category</Label>
                  <Select
                    onValueChange={(value) => setSelectedTag(value)}
                    value={selectedTag || ""}
                  >
                    <SelectTrigger id="tag">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {tags.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 flex items-center justify-between">
                  <Label htmlFor="split">Split</Label>
                  <Switch
                    id="split"
                    checked={split}
                    onCheckedChange={() => setSplit(!split)}
                  />
                </div>

                {split && (
                  <div className="space-y-2">
                    <Label htmlFor="selectFriends">Select Friends</Label>
                    <ScrollArea className="h-40 border rounded-md p-2">
                      {fetchingFriends ? (
                        <p>Loading...</p>
                      ) : friends.length > 0 ? (
                        friends.map((friend) => (
                          <div key={friend.userId._id} className="flex items-center justify-between py-2">
                            <Label htmlFor={`friend-${friend.userId._id}`} className="cursor-pointer">
                              {friend.userId.name}
                            </Label>
                            <Switch 
                              id={`friend-${friend.userId._id}`}
                              checked={selectedFriends[friend.userId._id] || false}
                              onCheckedChange={() => handleFriendToggle(friend.userId._id)}
                            />
                          </div>
                        ))
                      ) : (
                        <p>No friends found. Add friends to split expenses.</p>
                      )}
                    </ScrollArea>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="note">Note</Label>
                  <Input
                    id="note"
                    type="text"
                    name="note"
                    placeholder="Add a description"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    <p>{error}</p>
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Adding..." : "Add Expense"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <UserExpenses refresh={refresh} />
        </div>
      </div>
    </div>
  );
}