"use client";

import FreeMonthlyChart from "@/components/analytics/FreeMonthlyChart";
import PremiumSpendingDashboard from "@/components/analytics/PaidMontlyChart";
import { useSession } from "next-auth/react";

function Page() {
  const { data: session } = useSession();
  const isPremium = Boolean(session?.user?.isPremium);
  return (
    <div className="pt-16 pb-16 md:pb-2">
      {isPremium ? <PremiumSpendingDashboard /> : <FreeMonthlyChart />}
    </div>
  )
}

export default Page
