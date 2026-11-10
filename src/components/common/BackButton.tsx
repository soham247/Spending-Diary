import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type BackButtonProps = { label: string } & (
  { href: string; onClick?: never } | { href?: never; onClick: () => void }
);

export function BackButton({ label, href, onClick }: BackButtonProps) {
  const icon = <ArrowLeft className="size-5" aria-hidden="true" />;
  return href !== undefined ? (
    <Button asChild variant="ghost" size="icon" className="size-11 shrink-0">
      <Link href={href} aria-label={label} title={label}>
        {icon}
      </Link>
    </Button>
  ) : (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-11 shrink-0"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {icon}
    </Button>
  );
}
