import type { ReactNode } from "react";

export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="grid gap-6 border-b border-border pb-8 last:border-0 last:pb-0 lg:grid-cols-4 lg:gap-10"
    >
      <h2 className="font-heading text-base font-medium">{title}</h2>
      <div className="min-w-0 space-y-4 lg:col-span-3 lg:max-w-2xl">
        {children}
      </div>
    </section>
  );
}
