import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { DeviceSettings } from "@/components/settings/DeviceSettings";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { DiscoverySettings } from "@/components/settings/DiscoverySettings";
import Link from "next/link";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageLayout } from "@/components/shell/PageLayout";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
export default function SettingsPage() {
  return (
    <PageLayout
      header={<PageHeader title="Settings" />}
      contentClassName="space-y-8"
    >
      <div className="flex justify-start sm:justify-end">
        <Button asChild variant="ghost" className="-ml-2.5 sm:ml-0">
          <Link href="/insights">
            View spending insights
            <ArrowUpRight aria-hidden="true" strokeWidth={1.75} />
          </Link>
        </Button>
      </div>
      <SettingsSection title="Profile">
        <ProfileSettings />
      </SettingsSection>
      <DiscoverySettings />
      <NotificationSettings />
      <DeviceSettings />
      <AppearanceSettings />
      <AccountSettings />
    </PageLayout>
  );
}
