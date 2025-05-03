'use client'
 
export default function GlobalError({
  reset
}: {
  reset: () => void
}) {
  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={() => reset()}>Try again</button>
        <button onClick={() => window.location.href = '/'}>Return to home</button>
      </body>
    </html>
  )
}