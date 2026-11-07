import { ActivityFeed } from "@/components/activity/ActivityFeed";
export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Activity</h1>
      <ActivityFeed />
    </div>
  );
}
