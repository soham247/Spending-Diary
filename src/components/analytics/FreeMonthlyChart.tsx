"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import axios from "axios";

// Colors for different categories
const categoryColors: Record<string, string> = {
  Food: "#FF5252",       // Bright red
  Grocery: "#2196F3",    // Vibrant blue
  Transport: "#FFCA28",  // Golden yellow
  Medical: "#00BFA5",    // Teal
  Fruits: "#8E24AA",     // Purple
  Bills: "#FF6D00",      // Deep orange
  Rent: "#D81B60",       // Magenta
  Entertainment: "#546E7A", // Blue gray
  Other: "#3949AB"       // Indigo
};

export default function FreeMonthlyChart() {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMonthlyData = async () => {
      try {
        setLoading(true);
        // Fetch 6 months of expense data
        const response = await axios.get("/api/analytics/monthly-spending");
        setChartData(response.data.data);
      } catch (err) {
        setError("Failed to load chart data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyData();
  }, []);

  if (loading) return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Monthly Spending</CardTitle>
      </CardHeader>
      <CardContent className="h-80 flex items-center justify-center">
        <p>Loading chart data...</p>
      </CardContent>
    </Card>
  );

  if (error) return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Monthly Spending</CardTitle>
      </CardHeader>
      <CardContent className="h-80 flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </CardContent>
    </Card>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center sm:text-left">Monthly Spending</CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <div className="h-64 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                height={40}
              />
              <YAxis 
                width={40}
                tick={{ fontSize: 12 }}
              />
              <Tooltip />
              <Legend 
                wrapperStyle={{ 
                  fontSize: '12px',
                  paddingTop: '10px'
                }}
              />
              {Object.keys(categoryColors).map((category) => (
                chartData.some(item => item[category]) ? (
                  <Bar 
                    key={category} 
                    dataKey={category} 
                    stackId="a" 
                    fill={categoryColors[category]}
                  />
                ) : null
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}