import { OnboardingGate } from "@/components/shell/OnboardingGate";
import ReactQueryProvider from "@/components/ReactQueryProvider";
import { AppNavigation } from "@/components/shell/AppNavigation";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { assertServerSession } from "@/lib/auth/guards";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await assertServerSession();
  return <ReactQueryProvider>
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:p-4">Skip to content</a>
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset id="main" tabIndex={-1} className="min-w-0">
        <AppNavigation />
        <div className="w-full max-w-3xl px-4 py-6 sm:px-6 md:px-8 md:py-8"><OnboardingGate>{children}</OnboardingGate></div>
      </SidebarInset>
    </SidebarProvider>
  </ReactQueryProvider>;
}
