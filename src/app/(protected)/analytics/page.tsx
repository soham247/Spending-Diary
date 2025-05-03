"use client";

import FreeMonthlyChart from "@/components/analytics/FreeMonthlyChart";
import PremiumSpendingDashboard from "@/components/analytics/PaidMontlyChart";
import { useAuthStore } from "@/store/Auth";

function Page() {
  const { isPremium } = useAuthStore();
  return (
    <div className="pt-16 pb-16 md:pb-2">
      {isPremium ? <PremiumSpendingDashboard /> : <FreeMonthlyChart />}
    </div>
  )
}

export default Page