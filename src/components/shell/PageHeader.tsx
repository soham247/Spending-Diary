"use client";

import type { ReactNode } from "react";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";

export function PageHeader({
  title,
  titleId,
  description,
  actions,
  back,
}: {
  title: string;
  titleId?: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  const { openMobile } = useSidebar();

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="flex min-w-0 flex-1 basis-32 items-center gap-2 md:gap-3">
        {back ?? (
          <SidebarTrigger
            data-page-menu
            size="icon"
            className="size-11 shrink-0 md:hidden"
            aria-label="Toggle navigation"
            aria-expanded={openMobile}
          />
        )}
        <div className="min-w-0 flex-1">
          <h1
            id={titleId}
            className="flex min-h-11 items-center break-words text-lg font-semibold leading-snug md:min-h-9 md:text-xl"
          >
            <span className="min-w-0">{title}</span>
          </h1>
          {description && (
            <div className="mt-1 text-sm text-muted-foreground">
              {description}
            </div>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
