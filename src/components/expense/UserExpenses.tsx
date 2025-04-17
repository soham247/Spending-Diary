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
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Loader2, Trash2, Users, User, Receipt, FilterIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useAuthStore } from "@/store/Auth";
import { Expense } from "@/types/expense";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Separator } from "../ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";

export default function UserExpenses({ refresh }: { refresh: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const { userId } = useAuthStore();
  
  // Filter states
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1)); // Current month (1-12)
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear())); // Current year
  const [selectedTag, setSelectedTag] = useState<string>("All");
  
  const tags = ["All", "Food", "Grocery", "Transport", "Medical", "Fruits", "Bills", "Rent", "Entertainment", "Other"];
  
  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
    { value: "all", label: "All Months" }
  ];
  
  // Generate years (current year and 5 years back)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => String(currentYear - i));

  const getUserExpenses = async () => {
    setLoading(true);
    setError("");
    try {
      // Build URL with query parameters
      let url = "/api/expenses/userExpenses";
      const params = new URLSearchParams();
      
      if (selectedMonth !== "all") {
        params.append("month", selectedMonth);
      }
      
      params.append("year", selectedYear);
      
      if (selectedTag !== "All") {
        params.append("tag", selectedTag);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await axios.get(url);
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
  }, [selectedMonth, selectedYear, selectedTag]);

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
    // Check if current user created the expense
    const isCreator = expense.payers[0].userId === userId;
    
    // Check if it's a split expense
    const isSplit = isExpenseSplit(expense);
    
    if (isSplit) {
      return isCreator ? "split-owner" : "split-splitter";
    } else {
      return isCreator ? "owner" : "payer";
    }
  };

  const getUserAmount = (expense: Expense) => {
    const userPayer = expense.payers.find(payer => payer.userId === userId);
    return userPayer ? userPayer.amount : 0;
  };

  const getBadgeLabel = (role: string) => {
    switch (role) {
      case "split-owner":
        return "Split Owner";
      case "split-splitter":
        return "Split Splitter";
      case "owner":
        return "Owner";
      case "payer":
        return "Payer";
      default:
        return "Unknown";
    }
  };

  const getBadgeIcon = (role: string) => {
    switch (role) {
      case "split-owner":
      case "split-splitter":
        return <Users className="w-3 h-3" />;
      case "owner":
      case "payer":
        return <User className="w-3 h-3" />;
      default:
        return null;
    }
  };
  
  const getMonthName = (monthNum: string) => {
    return months.find(m => m.value === monthNum)?.label || "All Months";
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between sticky top-0 bg-background px-2 py-4 z-10 gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground font-sour_gummy">
          Expenses
        </h2>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Month selector */}
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Year selector */}
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Tag filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <FilterIcon className="h-4 w-4 mr-2" />
                {selectedTag === "All" ? "All Tags" : selectedTag}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60">
              <div className="grid grid-cols-2 gap-2">
                {tags.map((tag) => (
                  <Badge 
                    key={tag}
                    variant={selectedTag === tag ? "default" : "outline"}
                    className="cursor-pointer text-center py-1"
                    onClick={() => setSelectedTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex flex-col items-end">
          <p className="text-sm text-muted-foreground text-right">
            {expenses.length} {expenses.length === 1 ? "expense" : "expenses"} in {selectedMonth === "all" ? "" : getMonthName(selectedMonth)} {selectedYear}
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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="flex items-center gap-1 px-2 py-1">
                            {getBadgeIcon(userRole)}
                            <span>{getBadgeLabel(userRole)}</span>
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isSplit ? (
                            <p>Split between {expense.payers.length} people</p>
                          ) : (
                            <p>Personal expense</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
          <p className="text-lg font-medium text-foreground">No expenses found</p>
          <p className="text-sm text-muted-foreground">
            {selectedTag !== "All" 
              ? `No ${selectedTag.toLowerCase()} expenses in ${getMonthName(selectedMonth)} ${selectedYear}.`
              : `No expenses in ${getMonthName(selectedMonth)} ${selectedYear}.`}
          </p>
        </div>
      )}
    </div>
  );
}