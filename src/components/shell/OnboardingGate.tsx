"use client";
import { PushPrompt } from "@/components/settings/PushPrompt";
import { usePathname } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent } from "@/components/ui/card";
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const profile = useProfile();
  const pathname = usePathname();
  if (profile.isPending) return <LoadingState />;
  if (profile.isError)
    return <ErrorState retry={() => void profile.refetch()} />;
  if (!profile.data.onboardedAt && pathname !== "/onboarding")
    return (
      <div className="mx-auto max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Welcome to Spending Diary</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Choose the name your friends will see. Everything else is optional
            and can be added later.
          </p>
        </div>
        <Card>
          <CardContent>
            <ProfileForm profile={profile.data} destination={pathname} />
          </CardContent>
        </Card>
      </div>
    );
  return (
    <>
      {!profile.data.notificationPrefs.pushPrompted && (
        <div className="mb-6">
          <PushPrompt />
        </div>
      )}
      {children}
    </>
  );
}
