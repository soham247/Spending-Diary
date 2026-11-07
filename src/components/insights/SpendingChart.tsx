"use client";
import { Pie, PieChart, Cell } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
export function SpendingChart({
  categories,
}: {
  categories: { category: string; amount: number }[];
}) {
  const data = categories.slice(0, 5);
  const others = categories.slice(5).reduce((sum, row) => sum + row.amount, 0);
  const chart = others
    ? [...data, { category: "Other categories", amount: others }]
    : data;
  return (
    <ChartContainer
      config={{ amount: { label: "Spending" } }}
      className="mx-auto aspect-square max-h-64"
    >
      <PieChart accessibilityLayer>
        <Pie
          data={chart}
          dataKey="amount"
          nameKey="category"
          innerRadius="60%"
          isAnimationActive={false}
        >
          {chart.map((row, index) => (
            <Cell
              key={row.category}
              fill={"var(--chart-" + ((index % 5) + 1) + ")"}
            />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
