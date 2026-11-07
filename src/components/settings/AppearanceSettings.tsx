"use client";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
export function AppearanceSettings() {
  const { setTheme } = useTheme();
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Appearance</h2>
      <div className="flex gap-3">
        {["light", "dark", "system"].map((value) => (
          <Button
            variant="outline"
            className="capitalize"
            key={value}
            onClick={() => setTheme(value)}
          >
            {value}
          </Button>
        ))}
      </div>
    </section>
  );
}
