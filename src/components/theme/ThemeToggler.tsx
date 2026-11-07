"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function ModeToggle() {
  const { setTheme, theme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    clientSnapshot,
    serverSnapshot,
  );

  if (!mounted) {
    return (
      <div>
        <Button
          variant="outline"
          size="icon"
          className="hidden md:inline-flex"
          aria-label="Toggle theme"
        >
          <span className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button
        variant="ghost"
        size="icon"
        className="hidden md:inline-flex"
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
  );
}
