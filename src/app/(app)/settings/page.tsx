import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { DeviceSettings } from "@/components/settings/DeviceSettings";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { DiscoverySettings } from "@/components/settings/DiscoverySettings";
import Link from "next/link";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageLayout } from "@/components/shell/PageLayout";
export default function SettingsPage() {
  return (
    <PageLayout
      header={<PageHeader title="You" />}
      contentClassName="space-y-8"
    >
      <Link
        href="/insights"
        className="inline-block underline underline-offset-4"
      >
        View spending insights
      </Link>
      <ProfileSettings />
      <DiscoverySettings />
      <NotificationSettings />
      <DeviceSettings />
      <AppearanceSettings />
      <AccountSettings />
    </PageLayout>
  );
}
