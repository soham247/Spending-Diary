/* eslint-disable @typescript-eslint/no-explicit-any -- TODO Step7: remove when page is rewritten with Better Auth */
"use client";

import FreeMonthlyChart from "@/components/analytics/FreeMonthlyChart";
import PremiumSpendingDashboard from "@/components/analytics/PaidMontlyChart";
// TODO Step7: replace with Better Auth client;

function Page() {
  const session = null as any;
  const isPremium = Boolean(session?.user?.isPremium);
  return (
    <div className="pt-16 pb-16 md:pb-2">
      {isPremium ? <PremiumSpendingDashboard /> : <FreeMonthlyChart />}
    </div>
  )
}

export default Page




