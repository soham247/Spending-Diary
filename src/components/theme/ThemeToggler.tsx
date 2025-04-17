"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function ModeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div>
        <Button
          variant="outline"
          size="icon"
          className="w-9 h-9 p-0 hidden md:block"
          aria-label="Toggle theme"
        >
          <div className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <div>
      <Button
        variant="ghost"
        size="icon"
        className="w-7 h-7 hidden md:flex items-center"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4" />
        )}
      </Button>
    </div>
  )
}