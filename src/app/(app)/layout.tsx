import { OnboardingGate } from "@/components/shell/OnboardingGate";
import ReactQueryProvider from "@/components/ReactQueryProvider";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { AppContent } from "@/components/shell/AppContent";
import { MobileNavigation } from "@/components/shell/MobileNavigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { assertServerSession } from "@/lib/auth/guards";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertServerSession();
  return (
    <ReactQueryProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:p-4"
      >
        Skip to content
      </a>
      <SidebarProvider className="h-dvh min-h-0 overflow-hidden">
        <AppSidebar />
        <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
          <AppContent>
            <OnboardingGate>{children}</OnboardingGate>
          </AppContent>
          <MobileNavigation />
        </SidebarInset>
      </SidebarProvider>
    </ReactQueryProvider>
  );
}
