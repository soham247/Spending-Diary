"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordInput(
  props: Omit<ComponentProps<typeof Input>, "type" | "className">,
) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className="pr-12"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute inset-y-0 right-0 my-auto"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls={props.id}
        disabled={props.disabled}
        onClick={() => setVisible((value) => !value)}
      >
        <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
      </Button>
    </div>
  );
}
