"use client";
import type { Ref } from "react";
import { Input } from "@/components/ui/input";

export function AmountInput({
  id,
  value,
  onChange,
  onBlur,
  ref,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  ref?: Ref<HTMLInputElement>;
  invalid?: boolean;
}) {
  return (
    <Input
      id={id}
      ref={ref}
      aria-invalid={invalid}
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      placeholder="0.00"
      className="h-16 text-4xl tabular-nums md:text-4xl"
    />
  );
}
