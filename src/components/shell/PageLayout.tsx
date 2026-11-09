"use client";

import { use, useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PageNoticeContext } from "./page-notice";

export function PageLayout({
  header,
  toolbar,
  children,
  contentClassName,
}: {
  header: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}) {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const notice = use(PageNoticeContext);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border bg-background">
        <div className="page-gutter mx-auto w-full max-w-7xl py-2 md:py-3">
          {header}
        </div>
      </div>
      {toolbar && (
        <div
          className="shrink-0 border-b border-border bg-background"
          data-page-toolbar
        >
          <div className="page-gutter mx-auto w-full max-w-7xl py-3">
            {toolbar}
          </div>
        </div>
      )}
      <div
        ref={scrollRef}
        data-page-scroll
        tabIndex={0}
        role="region"
        aria-label="Page content"
        className="app-content min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-pt-6 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <div className="page-gutter mx-auto w-full max-w-7xl py-6 md:py-8">
          {notice && <div className="mb-6">{notice}</div>}
          <div className={cn("space-y-6", contentClassName)}>{children}</div>
        </div>
      </div>
    </div>
  );
}
