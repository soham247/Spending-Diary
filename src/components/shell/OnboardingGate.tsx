"use client";
import { PushPrompt } from "@/components/settings/PushPrompt";
import { usePathname } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageLayout } from "@/components/shell/PageLayout";
import { PageNoticeContext } from "@/components/shell/page-notice";
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const profile = useProfile();
  const pathname = usePathname();
  if (profile.isPending)
    return (
      <PageLayout header={<PageHeader title="Spending Diary" />}>
        <LoadingState />
      </PageLayout>
    );
  if (profile.isError)
    return (
      <PageLayout header={<PageHeader title="Spending Diary" />}>
        <ErrorState retry={() => void profile.refetch()} />
      </PageLayout>
    );
  if (!profile.data.onboardedAt && pathname !== "/onboarding")
    return (
      <PageLayout header={<PageHeader title="Welcome to Spending Diary" />}>
        <div className="mx-auto max-w-md space-y-6">
          <div className="space-y-2">
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
      </PageLayout>
    );
  return (
    <PageNoticeContext
      value={
        !profile.data.notificationPrefs.pushPrompted ? <PushPrompt /> : null
      }
    >
      {children}
    </PageNoticeContext>
  );
}
