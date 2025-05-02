"use client";

import UserExpenses from "@/components/expense/UserExpenses";
import AddExpenseForm from "@/components/expense/AddExpenseForm";
import { useAuthStore } from "@/store/Auth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ExpensePage() {
  const { userId } = useAuthStore();
  const [refresh, setRefresh] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const refreshExpenses = () => {
    setRefresh((prev) => !prev);
  };

  const handleExpenseAdded = () => {
    refreshExpenses();
    setShowForm(false);
  };

  return (
    <div className="container mx-auto px-2 md:px-8 py-8 max-w-7xl mt-10">
      <div className="grid gap-8 md:grid-cols-[350px,1fr]">
        <div className="space-y-6">
          {!showForm ? (
            <Card className="p-6 md:mt-36 lg:mt-24">
              <Button 
                onClick={() => setShowForm(true)} 
                className="w-full flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                Add an Expense
              </Button>
            </Card>
          ) : (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 z-10"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
              >
                <X className="h-4 w-4" />
              </Button>
              <ScrollArea>
                <AddExpenseForm 
                  userId={userId} 
                  onExpenseAdded={handleExpenseAdded} 
                />
              </ScrollArea>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <UserExpenses refresh={refresh} />
        </div>
      </div>
    </div>
  );
}