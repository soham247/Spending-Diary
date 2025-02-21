"use client";

import { useRouter } from "next/navigation";
import ShimmerButton from "@/components/ui/shimmer-button";
import {
  CreditCard,
  Users,
  PiggyBank,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useMemo } from "react";

export default function Home() {
  const router = useRouter();

  const sparklePositions = useMemo(
    () => [
      { left: 19, top: 30 },
      { left: 60, top: 46 },
      { left: 80, top: 70 },
    ],
    []
  );

  const features = [
    {
      icon: <CreditCard className="w-8 h-8" />,
      title: "Track Expenses",
      description:
        "Easily record every expense you make, whether solo or with friends",
      color: "bg-blue-500/10",
      highlight: "text-blue-500",
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Split Expenses",
      description:
        "Split expenses seamlessly between friends, no more awkward calculations",
      color: "bg-purple-500/10",
      highlight: "text-purple-500",
    },
    {
      icon: <PiggyBank className="w-8 h-8" />,
      title: "Track with Friends",
      description:
        "Keep track of what you owe and get owed, settle balances efficiently",
      color: "bg-green-500/10",
      highlight: "text-green-500",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex flex-col justify-center items-center text-center h-[60vh] lg:h-[90vh] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />

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

        <div className="relative z-10 max-w-4xl mx-auto px-4">
          <h1 className="text-6xl lg:text-8xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            Spending Diary
          </h1>
          <h3 className="text-xl lg:text-2xl mt-6 font-semibold text-muted-foreground">
            Track, Split, and Simplify Your Expenses with Friends.
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
              Get Started
            </ShimmerButton>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-16 grid gap-8 md:grid-cols-3">
        {features.map((feature, index) => (
          <div
            key={index}
            className="relative group p-6 rounded-2xl transition-all duration-300 hover:scale-105"
            style={{
              backgroundColor: `var(--${feature.color})`,
            }}
          >
            <div
              className={`${feature.color} rounded-xl p-3 inline-block mb-4`}
            >
              {feature.icon}
            </div>
            <h2 className="text-2xl font-bold mb-3">{feature.title}</h2>
            <p className="text-muted-foreground">{feature.description}</p>
            <div className="absolute inset-0 border-2 border-transparent hover:border-primary/20 rounded-2xl transition-all duration-300" />
          </div>
        ))}
      </section>

      <footer className="mt-auto bg-secondary pt-5 pb-3">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap justify-center md:justify-between gap-4 mb-4">
            <p className="hover:text-primary cursor-pointer transition-colors">
              About Us
            </p>
            <p className="hover:text-primary cursor-pointer transition-colors">
              Privacy Policy
            </p>
            <p className="hover:text-primary cursor-pointer transition-colors">
              Contact Us
            </p>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Spending Diary. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
