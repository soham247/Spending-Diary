"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Brush, ReferenceLine
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import axios, { AxiosError } from "axios";
import { formatCurrency } from "@/helpers/formatCurrency";

// Define types for chart data
interface TrendItem {
  period: string;
  total: number;
  average: number;
  maximum: number;
}

interface CategoryItem {
  name: string;
  value: number;
}

interface BreakdownItem {
  name: string;
  value: number;
  budget: number;
}

interface ForecastItem {
  period: string;
  actual: number | null;
  forecast?: number;
  upperBound?: number;
  lowerBound?: number;
}

interface ChartData {
  trends: TrendItem[];
  categories: CategoryItem[];
  breakdown: BreakdownItem[];
  forecast: ForecastItem[];
}

// Define type for tooltip payload
type TooltipPayloadItem = {
  name: string;
  value: number;
  color: string;
};

// Better color scheme for different categories
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

// Chart colors
const COLORS = Object.values(categoryColors);

export default function PremiumSpendingDashboard() {
  const [timeframe, setTimeframe] = useState("monthly");
  const [category, setCategory] = useState("all");
  const [date, setDate] = useState(new Date());
  const [chartData, setChartData] = useState<ChartData>({
    trends: [],
    categories: [],
    breakdown: [],
    forecast: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tags/categories from your expense model
  const categories = ["All", "Food", "Grocery", "Transport", "Medical", "Fruits", "Bills", "Rent", "Entertainment", "Other"];

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        
        // Format date for API request
        const formattedDate = format(date, 'yyyy-MM-dd');
        
        // Fetch analytics data based on selected filters
        const response = await axios.post("/api/analytics/monthly-spending", {
          params: {
            timeframe,
            category: category === "all" ? undefined : category,
            date: formattedDate
          }
        });
        
        setChartData(response.data.data);
      } catch (err: unknown) {
        if (err instanceof AxiosError) {
          setError(err.response?.data.error);
        } else
        setError("Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [timeframe, category, date]);

  // Custom tooltip for charts with proper typing
  const CustomTooltip = ({ 
    active, 
    payload, 
    label 
  }: { 
    active?: boolean, 
    payload?: TooltipPayloadItem[], 
    label?: string 
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md p-3 shadow-md">
          <p className="font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Premium Analytics</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center">
            <p>Loading analytics data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Premium Analytics</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate average for reference line
  const trendsAverage = chartData.trends.length > 0 
    ? chartData.trends.reduce((sum, item) => sum + item.total, 0) / chartData.trends.length 
    : 0;

  // Calculate average for forecast reference line
  const forecastAverage = chartData.forecast.length > 0 
    ? chartData.forecast
        .filter(item => item.actual !== null)
        .reduce((sum, item) => sum + (item.actual || 0), 0) / 
        chartData.forecast.filter(item => item.actual !== null).length 
    : 0;

  return (
    <div className="grid gap-4">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Premium Analytics Dashboard</CardTitle>
          <CardDescription>Advanced insights into your spending patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[120px]">
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-w-[120px]">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.slice(1).map((cat) => (
                    <SelectItem key={cat} value={cat.toLowerCase()}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-w-[120px]">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, 'MMMM yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(newDate)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different analytics views */}
      <Tabs defaultValue="trends">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="trends">Spending Trends</TabsTrigger>
          <TabsTrigger value="categories">Category Analysis</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="comparison">Budget Comparison</TabsTrigger>
        </TabsList>
        
        {/* Spending Trends Tab */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Spending Trends</CardTitle>
              <CardDescription>
                Analysis of your spending patterns over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData.trends}
                    margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      fill="#2196F3" 
                      stroke="#2196F3" 
                      fillOpacity={0.3} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="average" 
                      stroke="#FF6D00" 
                      dot={{ stroke: '#FF6D00', strokeWidth: 2, r: 4 }} 
                    />
                    <Bar dataKey="maximum" fill="#00BFA5" />
                    <ReferenceLine
                      y={trendsAverage}
                      stroke="#FF5252"
                      strokeDasharray="3 3"
                      label="Average"
                    />
                    <Brush dataKey="period" height={30} stroke="#8E24AA" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Category Analysis Tab */}
        <TabsContent value="categories">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.categories}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.categories.map((entry, index) => {
                          // Use category color if available, or fallback to index-based color
                          const color = categoryColors[entry.name] || COLORS[index % COLORS.length];
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend layout="vertical" verticalAlign="middle" align="right" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData.breakdown}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" scale="band" />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="value" fill="#8884d8">
                        {chartData.breakdown.map((entry, index) => {
                          // Use category color if available, or fallback to index-based color
                          const color = categoryColors[entry.name] || COLORS[index % COLORS.length];
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Forecast Tab */}
        <TabsContent value="forecast">
          <Card>
            <CardHeader>
              <CardTitle>Spending Forecast</CardTitle>
              <CardDescription>
                Projected expenses based on your historical data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData.forecast}
                    margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="actual" 
                      stroke="#2196F3" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 8 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="forecast" 
                      stroke="#00BFA5" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="upperBound" 
                      stroke="#FF6D00" 
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="lowerBound" 
                      stroke="#FF6D00" 
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                    />
                    <ReferenceLine 
                      y={forecastAverage} 
                      stroke="#FF5252" 
                      label="Average"
                      strokeDasharray="3 3" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Budget Comparison Tab */}
        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Budget vs. Actual</CardTitle>
              <CardDescription>
                Compare your actual spending against your budget
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData.breakdown}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="budget" fill="#8E24AA" name="Budget" />
                    <Bar dataKey="value" fill="#00BFA5" name="Actual" />
                    <ReferenceLine y={0} stroke="#000" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}