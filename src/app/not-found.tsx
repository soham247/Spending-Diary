import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center p-8 max-w-md">
        <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
        <h2 className="text-2xl font-semibold text-primary-foreground mb-6">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <Link 
          href="/" 
          className="px-4 py-2 bg-primary hover:bg-primary text-white font-medium rounded-md transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  )
}