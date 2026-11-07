"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BookOpen,
  ChartNoAxesColumn,
  House,
  LogOut,
  Plus,
  Settings,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { signOut } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

const links = [
  { href: "/home", label: "Home", icon: House },
  { href: "/expenses", label: "My spending", icon: Wallet },
  { href: "/groups", label: "Groups", icon: BookOpen },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/insights", label: "Insights", icon: ChartNoAxesColumn },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const client = useQueryClient();
  const { setOpenMobile } = useSidebar();
  const [signingOut, setSigningOut] = useState(false);

  async function logout() {
    setSigningOut(true);
    try {
      await signOut({ fetchOptions: { throw: true } });
      client.clear();
      setOpenMobile(false);
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Couldn't sign out. Check your connection and try again.");
      setSigningOut(false);
    }
  }

  return (
    <Sidebar collapsible="icon" aria-label="Application sidebar">
      <SidebarHeader className="gap-4 pt-4">
        <div className="flex items-center gap-1">
          <SidebarMenu className="min-w-0 flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" tooltip="Spending Diary">
                <Link href="/home" onClick={() => setOpenMobile(false)}>
                  <BookOpen strokeWidth={1.75} aria-hidden="true" />
                  <span className="font-semibold">Spending Diary</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            aria-label="Close navigation"
            onClick={() => setOpenMobile(false)}
          >
            <X strokeWidth={1.75} aria-hidden="true" />
          </Button>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip="Add expense"
              className="border border-sidebar-border"
            >
              <Link href="/expenses/new" onClick={() => setOpenMobile(false)}>
                <Plus strokeWidth={1.75} aria-hidden="true" />
                <span>Add expense</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Your diary</SidebarGroupLabel>
          <SidebarGroupContent>
            <nav aria-label="Main navigation">
              <SidebarMenu>
                {links.map(({ href, label, icon: Icon }) => {
                  const active =
                    pathname === href || pathname.startsWith(href + "/");
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={label}
                      >
                        <Link
                          href={href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setOpenMobile(false)}
                        >
                          <Icon strokeWidth={1.75} aria-hidden="true" />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="sidebar-safe-bottom">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Settings"
              isActive={pathname.startsWith("/settings")}
            >
              <Link
                href="/settings"
                aria-current={
                  pathname.startsWith("/settings") ? "page" : undefined
                }
                onClick={() => setOpenMobile(false)}
              >
                <Settings strokeWidth={1.75} aria-hidden="true" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign out"
              disabled={signingOut}
              onClick={logout}
            >
              <LogOut strokeWidth={1.75} aria-hidden="true" />
              <span>{signingOut ? "Signing out…" : "Sign out"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
