"use client";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SettingsSection } from "./SettingsSection";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return (
    <SettingsSection title="Appearance">
      <RadioGroup
        aria-label="Color theme"
        value={mounted ? theme : undefined}
        onValueChange={setTheme}
        className="grid grid-cols-3 gap-4"
        disabled={!mounted}
      >
        {[
          ["light", "Light"],
          ["dark", "Dark"],
          ["system", "System"],
        ].map(([value, label]) => (
          <Label
            key={value}
            htmlFor={`theme-${value}`}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border p-3 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-muted"
          >
            <RadioGroupItem id={`theme-${value}`} value={value} />
            <span>{label}</span>
          </Label>
        ))}
      </RadioGroup>
    </SettingsSection>
  );
}
