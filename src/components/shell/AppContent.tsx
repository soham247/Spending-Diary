"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useSidebar } from "@/components/ui/sidebar";

export function AppContent({ children }: { children: ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { isMobile, openMobile } = useSidebar();
  const wasOpenMobile = useRef(false);

  useEffect(() => {
    const restoreFocus = isMobile && wasOpenMobile.current && !openMobile;
    wasOpenMobile.current = openMobile;
    if (restoreFocus) {
      const frame = requestAnimationFrame(() =>
        contentRef.current
          ?.querySelector<HTMLButtonElement>("[data-page-menu]")
          ?.focus(),
      );
      return () => cancelAnimationFrame(frame);
    }
  }, [isMobile, openMobile]);

  return (
    <div
      ref={contentRef}
      id="main"
      tabIndex={-1}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      {children}
    </div>
  );
}
