import type { Metadata } from "next";
import { Oxanium } from "next/font/google";
import "./globals.css";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const oxanium = Oxanium({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-oxanium",
});

export const metadata: Metadata = {
  title: "Spending Diary — split costs, track spending",
  description:
    "Split shared expenses with friends and groups. Track your personal spending. See who owes whom at a glance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans", oxanium.variable)}
    >
      <body className={`${oxanium.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            {children}
            <Sonner />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
