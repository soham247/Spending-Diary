import { Receipt, DollarSign, Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center space-y-6 text-center">
        {/* Logo/Icon Animation */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          <Receipt className="w-16 h-16 text-primary animate-pulse" />
          <DollarSign className="w-6 h-6 text-primary absolute top-2 right-2 animate-bounce" />
          <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>
        
        {/* Loading text */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-sour_gummy">
            Loading Expenses
          </h1>
          <p className="text-muted-foreground">
            Fetching your financial data...
          </p>
        </div>
        
        {/* Loading spinner */}
        <div className="flex items-center space-x-2 text-primary">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Please wait</span>
        </div>
        
        {/* Skeleton cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl mt-4">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i} 
              className="h-48 rounded-lg bg-muted/40 animate-pulse relative overflow-hidden"
            >
              <div className="h-12 bg-muted/60 w-full"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-muted/60 w-1/2 rounded"></div>
                <div className="h-4 bg-muted/60 w-3/4 rounded"></div>
                <div className="h-4 bg-muted/60 w-1/3 rounded"></div>
              </div>
              <div className="absolute bottom-0 w-full h-8 bg-muted/60"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}