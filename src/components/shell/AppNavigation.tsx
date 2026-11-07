"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

const titles: Record<string, string> = {
  home: "Overview",
  expenses: "Expenses",
  groups: "Groups",
  friends: "Friends",
  activity: "Activity",
  insights: "Insights",
  settings: "Settings",
  settlements: "Payments",
  onboarding: "Your profile",
};

export function AppNavigation() {
  const pathname = usePathname();
  const { isMobile, open, openMobile } = useSidebar();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenMobile = useRef(false);
  useEffect(() => {
    const restoreFocus = isMobile && wasOpenMobile.current && !openMobile;
    wasOpenMobile.current = openMobile;
    if (restoreFocus) {
      const frame = requestAnimationFrame(() => triggerRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [isMobile, openMobile]);
  return (
    <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6">
      <SidebarTrigger
        ref={triggerRef}
        aria-label="Toggle navigation"
        aria-expanded={isMobile ? openMobile : open}
      />
      <Separator
        orientation="vertical"
        className="self-center data-[orientation=vertical]:h-5"
      />
      <p className="text-sm font-medium">
        {titles[pathname.split("/")[1]] ?? "Spending Diary"}
      </p>
    </header>
  );
}
