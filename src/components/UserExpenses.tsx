"use client";

import axios, { AxiosError } from "axios";
import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Loader2, Trash2, Users, User, Receipt } from "lucide-react";
import { Button } from "./ui/button";
import { useAuthStore } from "@/store/Auth";
import { Expense } from "@/types/expense";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Separator } from "./ui/separator";

export default function UserExpenses({ refresh }: { refresh: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const { userId } = useAuthStore();

  const getUserExpenses = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get("/api/expenses/userExpenses");
      if (response.status === 200) {        
        setExpenses(response.data.data);
      }
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        setError(error.response?.data.error);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };
    
  useEffect(() => {
    getUserExpenses();
  }, []);

  useEffect(() => {
    getUserExpenses();
  }, [refresh]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const deleteExpense = async (expenseId: string) => {
    try {
      const response = await axios.delete(
        `/api/expenses/delete?id=${expenseId}`
      );
      if (response.status === 200) {
        await getUserExpenses();
      }
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        setError(error.response?.data.error);
      } else {
        setError("Something went wrong");
      }
    }
  };

  const isExpenseSplit = (expense: Expense) => {
    return expense.payers && expense.payers.length > 1;
  };

  const getUserRole = (expense: Expense) => {
    if (!isExpenseSplit(expense)) return "owner";
    
    // Check if current user created the expense
    const userPayer = expense.payers.find(payer => payer.userId === userId);
    if (!userPayer) return "unknown";
    
    // If all payers have the same amount, it's an equal split
    const firstAmount = expense.payers[0].amount;
    const isEqualSplit = expense.payers.every(payer => payer.amount === firstAmount);
    
    return isEqualSplit ? "splitter" : "payer";
  };

  const getUserAmount = (expense: Expense) => {
    const userPayer = expense.payers.find(payer => payer.userId === userId);
    return userPayer ? userPayer.amount : 0;
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
      <div className="flex items-center justify-between sticky top-0 bg-background px-2 py-4 z-10">
        <h2 className="text-2xl font-bold tracking-tight text-foreground font-sour_gummy">
          Expenses
        </h2>
        <div className="flex flex-col items-end">
          <p className="text-sm text-muted-foreground">
            {expenses.length} {expenses.length === 1 ? "expense" : "expenses"} total
          </p>
          {expenses.length > 0 && (
            <p className="text-sm font-medium">
              Total: {formatCurrency(expenses.reduce((acc, expense) => 
                acc + getUserAmount(expense), 0))}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 text-sm text-destructive-foreground bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 auto-rows-max">
        {expenses.map((expense) => {
          const isSplit = isExpenseSplit(expense);
          const userRole = getUserRole(expense);
          const userAmount = getUserAmount(expense);
          
          return (
            <Card
              key={expense._id}
              className="overflow-hidden transition-shadow hover:shadow-lg"
            >
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="px-2 py-1">
                      {expense.tag}
                    </Badge>
                    {isSplit && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="flex items-center gap-1 px-2 py-1">
                              <Users className="w-3 h-3" />
                              <span>Split</span>
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Split between {expense.payers.length} people</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {userRole === "owner" && !isSplit && (
                      <Badge variant="outline" className="flex items-center gap-1 px-2 py-1">
                        <User className="w-3 h-3" />
                        <span>Owner</span>
                      </Badge>
                    )}
                    {userRole === "splitter" && (
                      <Badge variant="outline" className="flex items-center gap-1 px-2 py-1">
                        <Users className="w-3 h-3" />
                        <span>Splitter</span>
                      </Badge>
                    )}
                    {userRole === "payer" && (
                      <Badge variant="outline" className="flex items-center gap-1 px-2 py-1">
                        <User className="w-3 h-3" />
                        <span>Payer</span>
                      </Badge>
                    )}
                  </div>
                  <time className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(expense.createdAt)}
                  </time>
                </div>
                <CardDescription className="text-sm">
                  {expense.note}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Your share</span>
                    <CardTitle className="text-2xl font-bold text-primary">
                      {formatCurrency(userAmount)}
                    </CardTitle>
                  </div>
                  
                  {isSplit && (
                    <div className="flex flex-col items-end">
                      <span className="text-sm text-muted-foreground">Total expense</span>
                      <span className="text-lg font-semibold">
                        {formatCurrency(expense.amount)}
                      </span>
                    </div>
                  )}
                </div>
                
                {isSplit && (
                  <>
                    <Separator />
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between items-center">
                        <span>Split between {expense.payers.length} people</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="flex justify-end pt-2">
                {expense.payers[0].userId === userId && (
                  <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => deleteExpense(expense._id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  <span>Delete</span>
                </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {expenses.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-border bg-background">
          <Receipt className="w-12 h-12 text-muted-foreground mb-2" />
          <p className="text-lg font-medium text-foreground">No expenses yet</p>
          <p className="text-sm text-muted-foreground">
            Start adding your expenses to track them here.
          </p>
        </div>
      )}
    </div>
  );
}