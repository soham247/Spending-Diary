"use client";

import axios, { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "./ui/button";

interface Expense {
    _id: string;
    amount: number;
    tag: string;
    note: string;
    createdAt: Date;
}

export default function UserExpenses() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [expenses, setExpenses] = useState<Expense[]>([]);

    const getUserExpenses = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await axios.get("/api/expenses/userExpenses");
            if(response.status === 200) {
                setExpenses(response.data.data.expenses);
            }
        } catch (error: unknown) {
            if(error instanceof AxiosError) {
                setError(error.response?.data.error);
            } else {
                setError("Something went wrong");
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        getUserExpenses();
    }, []);


    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const deleteExpense = async (expenseId: string) => {
        try {
            const response = await axios.delete(`/api/expenses/delete?id=${expenseId}`);
            if (response.status === 200) {
                await getUserExpenses();
            }
        } catch (error: unknown) {
            if(error instanceof AxiosError) {
                setError(error.response?.data.error);
            } else {
                setError("Something went wrong");
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-6">
            <div className="flex items-center justify-between sticky top-0 bg-background py-4 z-10">
                <h2 className="text-2xl font-bold tracking-tight text-foreground font-sour_gummy">Expenses</h2>
                <p className="text-sm text-muted-foreground">
                    {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'} total
                </p>
            </div>

            {error && (
                <div className="p-4 text-sm text-destructive-foreground bg-destructive/10 rounded-md">
                    {error}
                </div>
            )}

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 auto-rows-max">
                {expenses.map((expense) => (
                    <Card key={expense._id} className="overflow-hidden transition-shadow hover:shadow-lg">
                        <CardHeader className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground whitespace-nowrap">
                                    {expense.tag}
                                </span>
                                <time className="text-sm text-muted-foreground whitespace-nowrap">
                                    {formatDate(expense.createdAt)}
                                </time>
                            </div>
                            <CardDescription className="text-sm line-clamp-2">
                                {expense.note}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CardTitle className="text-2xl font-bold text-primary">
                                {expense.amount}
                            </CardTitle>
                        </CardContent>
                        <CardFooter className="flex justify-end">
                            <Button
                                variant="ghost"
                                className="text-red-600"
                                onClick={() => deleteExpense(expense._id)}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                <span>Delete</span>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {expenses.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-border bg-background">
                    <p className="text-lg font-medium text-foreground">No expenses yet</p>
                    <p className="text-sm text-muted-foreground">Start adding your expenses to track them here.</p>
                </div>
            )}
        </div>
    );
}