import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageLayout } from "@/components/shell/PageLayout";
export default function ActivityPage() {
  return (
    <PageLayout header={<PageHeader title="Activity" />}>
      <ActivityFeed />
    </PageLayout>
  );
}
