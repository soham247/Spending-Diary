"use client";

import { useRouter } from "next/navigation";
import ShimmerButton from "@/components/ui/shimmer-button";
import {
  ArrowRight,
  Sparkles,
  BarChart4,
  Clock,
  Bell,
  Shield,
} from "lucide-react";
import { useMemo, useState } from "react";
import Footer from "@/components/Footer";

type UseCase = "personal" | "friends" | "travel";

type UseCaseData = {
  title: string;
  description: string;
  points: string[];
};

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<UseCase>("personal");

  const sparklePositions = useMemo(
    () => [
      { left: 19, top: 30 },
      { left: 60, top: 46 },
      { left: 80, top: 70 },
      { left: 25, top: 85 },
      { left: 75, top: 15 },
    ],
    []
  );

  const advancedFeatures = [
    {
      icon: <BarChart4 className="w-6 h-6" />,
      title: "Insightful Analytics",
      description: "Visualize spending patterns with customizable charts and reports",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Recurring Expenses",
      description: "Set up and track regular payments and subscriptions automatically",
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: "Smart Reminders",
      description: "Get notified about upcoming payments and unsettled balances",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure & Private",
      description: "Your financial data is encrypted and never shared with third parties",
    },
  ];

  const useCases: Record<UseCase, UseCaseData> = {
    personal: {
      title: "Personal Finance",
      description: "Track your daily expenses, categorize spending, and get insights into your financial habits. Set budgets and reach your savings goals faster.",
      points: [
        "Categorize personal expenses with custom tags",
        "Get monthly spending reports and insights",
        "Set budget limits and receive alerts",
        "Track recurring subscriptions and bills"
      ]
    },
    friends: {
      title: "Friends & Roommates",
      description: "Split rent, utilities, groceries, and other shared expenses effortlessly. Keep track of who paid what and settle up with confidence.",
      points: [
        "Split expenses equally or with custom amounts",
        "Track balances with multiple friends simultaneously",
        "Get reminded when payments are due",
        "Settle up with clear payment histories"
      ]
    },
    travel: {
      title: "Group Travel",
      description: "Make your trips stress-free by tracking all shared expenses. No more spreadsheets or confusion about who paid for what during your vacation.",
      points: [
        "Create trip-specific expense groups",
        "Split costs for accommodation, meals, and activities",
        "Handle expenses in multiple currencies",
        "Generate end-of-trip settlement summaries"
      ]
    }
  };

  const handleTabChange = (tab: UseCase) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex flex-col justify-center items-center text-center h-[70vh] lg:h-[90vh] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />

        <div className="absolute inset-0">
          {sparklePositions.map((pos, i) => (
            <div
              key={i}
              className="absolute animate-float"
              style={{
                left: `${pos.left}%`,
                top: `${pos.top}%`,
                animationDelay: `${i * 2}s`,
              }}
            >
              <Sparkles className="w-6 h-6 text-primary/40" />
            </div>
          ))}
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4">
          <span className="px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 inline-block">
            Simplify your expense management
          </span>
          <h1 className="text-6xl lg:text-8xl font-extrabold bg-clip-text text-transparent font-sour_gummy bg-gradient-to-r from-primary to-primary/60">
            Spending Diary
          </h1>
          <h3 className="text-lg lg:text-xl mt-6 font-semibold text-muted-foreground max-w-3xl mx-auto">
            The smart way to track expenses, split bills with friends, and manage your finances in one place.
          </h3>
          <div className="flex gap-5 mt-8 justify-center font-semibold">
            <button
              onClick={() => router.push("/login")}
              className="group relative px-6 py-3 border-2 border-primary rounded-lg transition-colors hover:bg-primary/5"
            >
              Log In
              <ArrowRight className="w-4 h-4 inline-block ml-2 transition-transform group-hover:translate-x-1" />
            </button>
            <ShimmerButton
              borderRadius="15px"
              shimmerSize="0.1em"
              onClick={() => router.push("/register")}
              className="px-6 py-3"
            >
              Get Started Free
            </ShimmerButton>
          </div>
          <p className="mt-4 text-muted-foreground text-sm">No credit card required • Free basic plan • Cancel anytime</p>
        </div>
      </header>
      
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-2 text-primary">Perfect For Every Situation</h2>
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
            Whether you&apos;re managing personal finances, splitting bills with roommates, or traveling with friends, 
            Spending Diary has you covered.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {(Object.keys(useCases) as UseCase[]).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-5 py-2 rounded-full transition-all ${
                  activeTab === tab 
                  ? "bg-primary text-white" 
                  : "bg-secondary hover:bg-primary/10"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="p-6">
              <h3 className="text-2xl font-bold mb-3">{useCases[activeTab].title}</h3>
              <p className="text-muted-foreground mb-6">{useCases[activeTab].description}</p>
              <ul className="space-y-3">
                {useCases[activeTab].points.map((point, index) => (
                  <li key={index} className="flex items-start">
                    <div className="mr-3 mt-1 text-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </div>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-2 border border-gray-200">
              <div className="aspect-video w-full rounded-lg bg-gray-100 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">[{useCases[activeTab].title} Screenshot]</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-primary">More Powerful Features</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {advancedFeatures.map((feature, index) => (
              <div key={index} className="p-6 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="mb-4 text-primary">{feature.icon}</div>
                <h3 className="font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      <section className="py-16 bg-primary/5">
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center px-4">
          <h2 className="text-3xl font-bold mb-6">Start Managing Your Expenses Today</h2>
          <p className="mb-8 text-muted-foreground">
            Join thousands of users who are already saving time and reducing stress with Spending Diary.
            Our intuitive platform makes expense tracking and bill splitting effortless.
          </p>
          <ShimmerButton
            borderRadius="15px"
            shimmerSize="0.1em"
            onClick={() => router.push("/register")}
            className="px-8 py-4 text-lg"
          >
            Create Free Account
          </ShimmerButton>
        </div>
      </section>
      <Footer />
    </div>
  );
}