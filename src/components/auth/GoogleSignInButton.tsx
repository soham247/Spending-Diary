"use client";

import { useId } from "react";
import { GoogleLogoIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton() {
  const helpId = useId();
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        disabled
        aria-describedby={helpId}
      >
        <GoogleLogoIcon className="size-4" weight="bold" aria-hidden="true" />
        Continue with Google
      </Button>
      <p id={helpId} className="text-center text-xs text-muted-foreground">
        Google sign-in is currently unavailable
      </p>
    </div>
  );
}
