"use client";

import type { ComponentProps } from "react";
import { cva } from "class-variance-authority";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const headerAction = cva("shrink-0", {
  variants: {
    presentation: {
      responsive: "size-11 p-0 md:h-9 md:w-auto md:gap-2 md:px-3",
    },
  },
  defaultVariants: { presentation: "responsive" },
});

export function PageHeaderAction({
  label,
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, "children" | "asChild"> & {
  label: string;
}) {
  return (
    <Button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={cn(headerAction(), className)}
    >
      <Plus className="size-5 md:size-4" aria-hidden="true" />
      <span className="hidden md:inline">{label}</span>
    </Button>
  );
}
