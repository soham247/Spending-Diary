export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      <div className="flex flex-col items-center max-w-md w-full">
        {/* Coins animation */}
        <div className="relative h-32 w-32 mb-8">
          <div className="absolute w-20 h-20 bg-primary rounded-full left-0 top-0 animate-float opacity-90"></div>
          <div className="absolute w-16 h-16 bg-primary/80 rounded-full right-4 top-6 animate-float opacity-80" style={{animationDelay: '1s'}}></div>
          <div className="absolute w-12 h-12 bg-primary/70 rounded-full left-4 bottom-0 animate-float opacity-70" style={{animationDelay: '2s'}}></div>
          <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-white">$</div>
        </div>
        
        <h2 className="text-2xl font-bold mb-6 text-center text-primary font-sour_gummy">Spending Diary</h2>
        
        {/* Loading animation */}
        <div className="flex space-x-2 justify-center mb-4">
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
        </div>
        
        <div className="text-sm text-muted-foreground">
          Loading your financial dashboard...
        </div>
      </div>
    </div>
  );
}