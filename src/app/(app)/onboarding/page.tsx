import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { safeRedirect } from "@/lib/utils/url";
export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  return <div className="space-y-6"><h1 className="text-2xl font-semibold">Welcome to Spending Diary</h1><p className="text-muted-foreground">Choose the name your friends will see. You can add a UPI ID later.</p><ProfileSettings destination={safeRedirect(callbackUrl)} /></div>;
}
