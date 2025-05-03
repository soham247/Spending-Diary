"use client";

import UserExpenses from "@/components/expense/UserExpenses";
import AddExpenseForm from "@/components/expense/AddExpenseForm";
import { useAuthStore } from "@/store/Auth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tag } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ExpensePage() {
  const { userId } = useAuthStore();
  const [refresh, setRefresh] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const refreshExpenses = () => {
    setRefresh((prev) => !prev);
  };

  const handleExpenseAdded = () => {
    refreshExpenses();
    setShowDialog(false);
  };

  return (
    <div className="container mx-auto px-2 md:px-8 py-8 max-w-7xl mt-10 relative min-h-screen">
      {/* Dialog for Add Expense Form */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden border-t-4 border-primary border-l-0 border-r-0">
          <DialogHeader className="px-4 pt-6 pb-2">
            <DialogTitle className="flex items-center font-sour_gummy text-xl gap-1">
              <Tag className="w-4 h-4" /> Add Expense
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="pb-6 max-h-[calc(90vh-80px)]">
            <AddExpenseForm 
              userId={userId} 
              onExpenseAdded={handleExpenseAdded} 
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <UserExpenses refresh={refresh} />
      </div>
      
      {/* Floating circular add button positioned at bottom right */}
      <Button
        onClick={() => setShowDialog(true)}
        className="fixed bottom-20 md:bottom-8 right-3 md:right-8 z-10 rounded-full w-14 h-14 shadow-lg flex items-center justify-center p-0 bg-primary hover:bg-primary/90 text-4xl font-light"
        aria-label="Add expense"
        size={"icon"}
      >+
      </Button>
    </div>
  );
}