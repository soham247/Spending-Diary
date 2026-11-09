import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { safeRedirect } from "@/lib/utils/url";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageLayout } from "@/components/shell/PageLayout";
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  return (
    <PageLayout header={<PageHeader title="Welcome to Spending Diary" />}>
      <p className="text-muted-foreground">
        Choose the name your friends will see. You can add a UPI ID later.
      </p>
      <ProfileSettings destination={safeRedirect(callbackUrl)} />
    </PageLayout>
  );
}
