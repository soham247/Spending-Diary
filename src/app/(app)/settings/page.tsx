import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { DeviceSettings } from "@/components/settings/DeviceSettings";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import Link from "next/link";
export default function SettingsPage() {
  return <div className="space-y-8"><h1 className="text-2xl font-semibold">You</h1><Link href="/insights" className="inline-block underline underline-offset-4">View spending insights</Link><ProfileSettings /><NotificationSettings /><DeviceSettings /><AppearanceSettings /><AccountSettings /></div>;
}
