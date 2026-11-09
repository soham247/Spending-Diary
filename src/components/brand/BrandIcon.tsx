import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/logo.svg"
      width={32}
      height={32}
      alt=""
      aria-hidden="true"
      className={cn("size-6 shrink-0", className)}
      unoptimized
    />
  );
}
