'use client'

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full rounded-lg shadow-md p-8 text-center">
            <div className="mb-6">
              <svg 
                className="mx-auto h-16 w-16 text-red-500" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
            
            <p className="text-muted-foreground mb-8">
              We&apos;ve encountered an unexpected error. You can try again or return to the home page.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => reset()} 
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-md transition-colors"
              >
                Try again
              </button>
              
              <button 
                onClick={() => window.location.href = '/'} 
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-md transition-colors"
              >
                Return to home
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 p-4 bg-gray-100 rounded-md text-left">
                <p className="font-medium mb-2">Error details (development only):</p>
                <p className="text-sm font-mono break-all text-red-600">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs font-mono mt-2 text-gray-500">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}