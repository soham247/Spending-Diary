import {
  Activity,
  BookOpen,
  ChartNoAxesColumn,
  House,
  Users,
  Wallet,
} from "lucide-react";

export const primaryNavigation = [
  { href: "/home", label: "Home", mobileLabel: "Home", icon: House },
  {
    href: "/expenses",
    label: "My spending",
    mobileLabel: "Spending",
    icon: Wallet,
  },
  { href: "/groups", label: "Groups", mobileLabel: "Groups", icon: BookOpen },
  { href: "/friends", label: "Friends", mobileLabel: "Friends", icon: Users },
];

export const secondaryNavigation = [
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/insights", label: "Insights", icon: ChartNoAxesColumn },
];

export function isNavigationActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}
