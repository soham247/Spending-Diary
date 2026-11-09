"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { isNavigationActive, primaryNavigation } from "./navigation";

export function MobileNavigation() {
  const pathname = usePathname();
  const { openMobile } = useSidebar();

  return (
    <nav
      aria-label="Quick navigation"
      hidden={openMobile}
      className="mobile-navigation fixed inset-x-4 z-30 mx-auto max-w-sm rounded-full border border-border bg-card p-1.5 text-card-foreground shadow-lg md:hidden"
    >
      <div className="grid grid-cols-4 gap-1">
        {primaryNavigation.map(({ href, mobileLabel, icon: Icon }) => {
          const active = isNavigationActive(pathname, href);
          return (
            <Button
              key={href}
              asChild
              variant={active ? "secondary" : "ghost"}
              className="h-14 min-w-0 flex-col gap-1 rounded-full px-1 text-xs"
            >
              <Link href={href} aria-current={active ? "page" : undefined}>
                <Icon
                  className="size-5"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span>{mobileLabel}</span>
              </Link>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
