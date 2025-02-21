"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import UserExpenses from "@/components/UserExpenses";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import axios from "axios";
import { useState } from "react";

export default function ExpensePage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const addExpense = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const amount = formData.get("amount");
        const tag = formData.get("tag");
        const note = formData.get("note");

        setError("");
        try {
            setLoading(true);
            await axios.post("/api/expenses/create", {
                amount,
                tag,
                note
            });
            // Reset form after successful submission
            (e.target as HTMLFormElement).reset();
        } catch (error) {
            setError("Failed to add expense. Please try again.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

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

                                <div className="space-y-2">
                                    <Label htmlFor="tag">Category</Label>
                                    <Input
                                        id="tag"
                                        type="text"
                                        name="tag"
                                        placeholder="e.g., Food, Transport, Bills"
                                        required
                                    />
                                </div>

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

                                <Button 
                                    type="submit"
                                    disabled={loading}
                                    className="w-full"
                                >
                                    {loading ? "Adding..." : "Add Expense"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <UserExpenses />
                </div>
            </div>
        </div>
    );
}