import { InsightsScreen } from "@/components/insights/InsightsScreen";
import { insightsInputSchema } from "@/lib/validation/insights";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const { month } = await searchParams;
  const parsed = insightsInputSchema.safeParse({ month });
  const initialMonth = parsed.success ? parsed.data.month : undefined;
  return (
    <InsightsScreen
      key={initialMonth ?? "current"}
      initialMonth={initialMonth}
    />
  );
}
