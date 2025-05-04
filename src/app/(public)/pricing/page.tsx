"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import ShimmerButton from "@/components/ui/shimmer-button";
import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface PricingPlan {
    name: string;
    description: string;
    price: string;
    period: string;
    features: Array<{ name: string; included: boolean }>;
    cta: string;
    highlight?: boolean;
}

export default function Pricing() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState("yearly");

  const pricing: Record<string, PricingPlan> = {
    free: {
      name: "Free",
      description: "Perfect for casual users and beginners",
      price: "₹0",
      period: "/forever",
      features: [
        { name: "Add up to 7 friends", included: true },
        { name: "Create 1 expense group", included: true },
        { name: "Basic expense tracking", included: true },
        { name: "Simple bill splitting", included: true },
        { name: "Basic analytics", included: true },
        { name: "30-day expense history", included: true },
        { name: "Extended analytics", included: false },
        { name: "Unlimited expense history", included: false },
        { name: "Custom categories", included: false },
        { name: "Payment reminders", included: false },
      ],
      cta: "Get Started Free",
    },
    premium: {
      name: "Premium",
      description: "For those who want the complete experience",
      price: billingCycle === "yearly" ? "₹79" : "₹7",
      period: billingCycle === "yearly" ? "/year" : "/month",
      features: [
        { name: "Unlimited friends", included: true },
        { name: "Multiple expense groups", included: true },
        { name: "Advanced expense tracking", included: true },
        { name: "Advanced bill splitting", included: true },
        { name: "Full analytics dashboard", included: true },
        { name: "Unlimited expense history", included: true },
        { name: "Custom expense categories", included: true },
        { name: "Smart payment reminders", included: true },
        // { name: "Export to CSV/PDF", included: true },
        { name: "Priority support", included: true },
      ],
      cta: "Go Premium",
      highlight: true
    },
  };

  const faqs = [
    {
      question: "Can I upgrade or downgrade my plan?",
      answer: "Yes, you can upgrade to Premium at any time. If you need to downgrade, you can do so when your current billing period ends."
    },
    {
      question: "How does the billing work?",
      answer: "For Premium plans, we offer monthly or yearly billing. You'll be charged at the beginning of each billing cycle."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards, debit cards, UPI, and net banking payments."
    },
    {
      question: "Is there a refund policy?",
      answer: "Yes, we offer a 14-day money-back guarantee if you're not satisfied with your Premium subscription."
    }
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <header className="pt-20 pb-14 bg-gradient-to-b from-primary/10 to-transparent text-center">
        <div className="max-w-4xl md:max-w-3xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary">Simple, Transparent Pricing</h1>
          <p className="md:mt-5 text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that&apos;s right for you and start managing your expenses with ease.
          </p>
        </div>
      </header>

      <main className="flex-grow pb-8 md:py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Billing toggle */}
          <div className="flex justify-center mb-12">
            <div className="bg-secondary rounded-full p-1 inline-flex">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`py-2 px-4 rounded-full transition-all ${
                  billingCycle === "monthly"
                    ? "bg-background shadow-sm"
                    : "hover:bg-background/30"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`py-2 px-4 rounded-full transition-all flex items-center ${
                  billingCycle === "yearly"
                    ? "bg-background shadow-sm"
                    : "hover:bg-background/30"
                }`}
              >
                Yearly
                <span className="ml-2 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
                  Save 6%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {Object.values(pricing).map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl overflow-hidden border border-border transition-all ${
                  plan.highlight
                    ? "bg-card shadow-lg relative transform md:scale-105 md:-translate-y-2"
                    : "bg-card/80"
                }`}
              >
                <div className="p-8">
                  <h2 className="text-2xl font-bold mb-1">{plan.name}</h2>
                  <p className="text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex items-baseline mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-1">
                      {plan.period}
                    </span>
                  </div>

                  <ShimmerButton
                    borderRadius="8px"
                    shimmerSize="0.1em"
                    onClick={() => router.push(plan.name === "Free" ? "/register" : "/checkout")}
                    className={`w-full py-3 mb-8 ${!plan.highlight && "bg-secondary hover:bg-secondary/80 text-foreground"}`}
                  >
                    {plan.cta}
                  </ShimmerButton>

                  <div className="space-y-4">
                    {plan.features.map((feature) => (
                      <div key={feature.name} className="flex items-start">
                        {feature.included ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400 mr-3 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                        )}
                        <span
                          className={feature.included ? "" : "text-muted-foreground"}
                        >
                          {feature.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <section className="py-16 bg-secondary/30 mt-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="mt-8">
            {faqs.map((faq, index) => (
              <AccordionItem value={`item-${index+1}`} key={index}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent className="text-left text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="py-12 bg-primary/5">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
          <p className="mb-6 text-muted-foreground">
            Our team is here to help you choose the right plan for your needs.
          </p>
          <button
            onClick={() => router.push("/contact")}
            className="inline-flex items-center px-5 py-2 font-medium rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            Contact Support
            <ArrowRight className="ml-2 w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}