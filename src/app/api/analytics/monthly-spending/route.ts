import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

type SimpleExpense = { amount: number; tag: string; createdAt: Date | string };

// Helper function to get month name from date
const getMonthName = (date: Date | string) => {
  return new Date(date).toLocaleString('default', { month: 'short' });
};

// Helper function to get week number from date
const getWeekNumber = (date: Date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

interface MonthlyDataItem {
  month: string;
  total: number;
  Food: number;
  Grocery: number;
  Transport: number;
  Medical: number;
  Fruits: number;
  Bills: number;
  Rent: number;
  Entertainment: number;
  Other: number;
  [key: string]: number | string;
}

// Helper function to process expense data by month
const processMonthlyData = (expenses: SimpleExpense[]) => {
  const monthlyData: Record<string, MonthlyDataItem> = {};
  
  expenses.forEach(expense => {
    const date = new Date(expense.createdAt);
    const monthYear = `${getMonthName(date)} ${date.getFullYear()}`;
    
    if (!monthlyData[monthYear]) {
      monthlyData[monthYear] = {
        month: monthYear,
        total: 0,
        Food: 0,
        Grocery: 0,
        Transport: 0,
        Medical: 0,
        Fruits: 0,
        Bills: 0,
        Rent: 0,
        Entertainment: 0,
        Other: 0
      };
    }
    
    monthlyData[monthYear].total += expense.amount;
    
    if (typeof monthlyData[monthYear][expense.tag] === 'number') {
      monthlyData[monthYear][expense.tag] = (monthlyData[monthYear][expense.tag] as number) + expense.amount;
    } else {
      monthlyData[monthYear][expense.tag] = expense.amount;
    }
  });
  
  return Object.values(monthlyData).sort((a, b) => {
    const dateA = new Date(a.month as string);
    const dateB = new Date(b.month as string);
    return dateA.getTime() - dateB.getTime();
  });
};

// API route for basic monthly spending (free version)
async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const expenses = await db.expense.findMany({
      where: {
        payers: { some: { userId } },
        createdAt: { gte: sixMonthsAgo },
      },
      orderBy: { createdAt: 'asc' },
      select: { amount: true, tag: true, createdAt: true },
    });
    
    const monthlyData = processMonthlyData(expenses);
    
    return NextResponse.json({
      message: "Monthly spending data retrieved",
      success: true,
      data: monthlyData
    }, { status: 200 });
    
  } catch (error) {
    console.error("Error retrieving analytics:", error);
    return NextResponse.json(
      { error: "Failed to retrieve analytics data" },
      { status: 500 }
    );
  }
}

// Advanced analytics endpoint for premium version
async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const user = await db.user.findUnique({ where: { id: userId }, select: { isPremium: true } });
    if (!user?.isPremium) {
      return NextResponse.json(
        { error: "Premium subscription required" },
        { status: 403 }
      );
    }
    
    const url = new URL(request.url);
    const timeframe = url.searchParams.get('timeframe') || 'monthly';
    const category = url.searchParams.get('category');
    const dateParam = url.searchParams.get('date');
    
    const endDate = dateParam ? new Date(dateParam) : new Date();
    const startDate = new Date(endDate);
    
    switch(timeframe) {
      case 'weekly':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'monthly':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'quarterly':
        startDate.setFullYear(endDate.getFullYear() - 2);
        break;
      case 'yearly':
        startDate.setFullYear(endDate.getFullYear() - 5);
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 6);
    }
    
    const where: any = {
      payers: { some: { userId } },
      createdAt: { gte: startDate, lte: endDate },
    };
    if (category && category !== 'all') {
      where.tag = category;
    }
    
    const expenses = await db.expense.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: { amount: true, tag: true, createdAt: true },
    });
    
    const trendsData = processTrendsData(expenses, timeframe);
    const categoriesData = processCategoriesData(expenses);
    const breakdownData = processBreakdownData(expenses);
    const forecastData = processForecastData(expenses, timeframe);
    
    return NextResponse.json({
      message: "Premium analytics data retrieved",
      success: true,
      data: {
        trends: trendsData,
        categories: categoriesData,
        breakdown: breakdownData,
        forecast: forecastData
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error("Error retrieving premium analytics:", error);
    return NextResponse.json(
      { error: "Failed to retrieve premium analytics data" },
      { status: 500 }
    );
  }
}

function processTrendsData(expenses: SimpleExpense[], timeframe: string) {
  const periodsData: Record<string, {
    period: string;
    total: number;
    count: number;
    maximum: number;
  }> = {};
  
  expenses.forEach(expense => {
    const date = new Date(expense.createdAt);
    let periodKey;
    
    switch(timeframe) {
      case 'weekly':
        const weekNumber = getWeekNumber(date);
        periodKey = `Week ${weekNumber}, ${date.getFullYear()}`;
        break;
      case 'monthly':
        periodKey = `${getMonthName(date)} ${date.getFullYear()}`;
        break;
      case 'quarterly':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        periodKey = `Q${quarter} ${date.getFullYear()}`;
        break;
      case 'yearly':
        periodKey = date.getFullYear().toString();
        break;
      default:
        periodKey = `${getMonthName(date)} ${date.getFullYear()}`;
    }
    
    if (!periodsData[periodKey]) {
      periodsData[periodKey] = {
        period: periodKey,
        total: 0,
        count: 0,
        maximum: 0
      };
    }
    
    periodsData[periodKey].total += expense.amount;
    periodsData[periodKey].count += 1;
    periodsData[periodKey].maximum = Math.max(periodsData[periodKey].maximum, expense.amount);
  });
  
  const result = Object.values(periodsData).map(period => ({
    period: period.period,
    total: period.total,
    average: period.count > 0 ? period.total / period.count : 0,
    maximum: period.maximum
  }));
  
  return result;
}

// Process data for category pie chart
function processCategoriesData(expenses: SimpleExpense[]) {
  const categories: Record<string, number> = {};
  
  expenses.forEach(expense => {
    if (!categories[expense.tag]) {
      categories[expense.tag] = 0;
    }
    categories[expense.tag] += expense.amount;
  });
  
  return Object.entries(categories).map(([name, value]) => ({
    name,
    value
  }));
}

// Process data for breakdown bar chart
function processBreakdownData(expenses: SimpleExpense[]) {
  const categories: Record<string, number> = {};
  
  expenses.forEach(expense => {
    if (!categories[expense.tag]) {
      categories[expense.tag] = 0;
    }
    categories[expense.tag] += expense.amount;
  });
  
  return Object.entries(categories).map(([name, value]) => ({
    name,
    value,
    budget: (value as number) * (Math.random() * 0.5 + 0.7)
  }));
}

// Process data for forecast chart
function processForecastData(expenses: SimpleExpense[], timeframe: string) {
  interface ForecastPeriodData {
    period: string;
    actual: number | null;
    forecast?: number;
  }
  
  const periodsData: Record<string, ForecastPeriodData> = {};
  
  expenses.forEach(expense => {
    const date = new Date(expense.createdAt);
    let periodKey;
    
    switch(timeframe) {
      case 'weekly':
        const weekNumber = getWeekNumber(date);
        periodKey = `Week ${weekNumber}, ${date.getFullYear()}`;
        break;
      case 'monthly':
        periodKey = `${getMonthName(date)} ${date.getFullYear()}`;
        break;
      case 'quarterly':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        periodKey = `Q${quarter} ${date.getFullYear()}`;
        break;
      case 'yearly':
        periodKey = date.getFullYear().toString();
        break;
      default:
        periodKey = `${getMonthName(date)} ${date.getFullYear()}`;
    }
    
    if (!periodsData[periodKey]) {
      periodsData[periodKey] = {
        period: periodKey,
        actual: 0
      };
    }
    
    periodsData[periodKey].actual = (periodsData[periodKey].actual || 0) + expense.amount;
  });
  
  const result = Object.values(periodsData);
  
  result.sort((a, b) => {
    const dateA = new Date(parseDate(a.period, timeframe));
    const dateB = new Date(parseDate(b.period, timeframe));
    return dateA.getTime() - dateB.getTime();
  });
  
  if (result.length > 0) {
    const lastPeriods = result.slice(-3);
    const avgGrowth = calculateAverageGrowth(lastPeriods);
    
    const latestPeriod = result[result.length - 1];
    let lastAmount = latestPeriod.actual || 0;
    let nextPeriodDate = getNextPeriodDate(latestPeriod.period, timeframe);
    
    for (let i = 0; i < 3; i++) {
      const forecastAmount = lastAmount * (1 + avgGrowth);
      const periodName = formatPeriodName(nextPeriodDate, timeframe);
      
      result.push({
        period: periodName,
        forecast: forecastAmount,
        actual: null
      });
      
      lastAmount = forecastAmount;
      nextPeriodDate = getNextPeriodDate(periodName, timeframe);
    }
  }
  
  return result;
}

function calculateAverageGrowth(periods: Array<{period: string, actual: number | null}>) {
  if (periods.length <= 1) return 0.05;
  
  let totalGrowth = 0;
  let growthPoints = 0;
  
  for (let i = 1; i < periods.length; i++) {
    const current = periods[i].actual || 0;
    const previous = periods[i-1].actual || 0;
    
    if (previous > 0) {
      totalGrowth += (current - previous) / previous;
      growthPoints++;
    }
  }
  
  return growthPoints > 0 ? totalGrowth / growthPoints : 0.05;
}

function getNextPeriodDate(periodStr: string, timeframe: string) {
  const date = parseDate(periodStr, timeframe);
  
  switch(timeframe) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1);
  }
  
  return date;
}

function formatPeriodName(date: Date, timeframe: string) {
  switch(timeframe) {
    case 'weekly':
      return `Week ${getWeekNumber(date)}, ${date.getFullYear()}`;
    case 'monthly':
      return `${getMonthName(date)} ${date.getFullYear()}`;
    case 'quarterly':
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${date.getFullYear()}`;
    case 'yearly':
      return date.getFullYear().toString();
    default:
      return `${getMonthName(date)} ${date.getFullYear()}`;
  }
}

function parseDate(periodStr: string, timeframe: string) {
  const date = new Date();
  
  switch(timeframe) {
    case 'weekly':
      const weekParts = periodStr.match(/Week (\d+), (\d+)/);
      if (weekParts) {
        const weekNum = parseInt(weekParts[1]);
        const year = parseInt(weekParts[2]);
        date.setFullYear(year);
        date.setMonth(0, 1);
        date.setDate(1 + (weekNum - 1) * 7);
      }
      break;
    case 'monthly':
      const monthParts = periodStr.match(/([A-Za-z]+) (\d+)/);
      if (monthParts) {
        const monthName = monthParts[1];
        const year = parseInt(monthParts[2]);
        const monthIndex = new Date(`${monthName} 1, 2000`).getMonth();
        date.setFullYear(year);
        date.setMonth(monthIndex);
        date.setDate(1);
      }
      break;
    case 'quarterly':
      const quarterParts = periodStr.match(/Q(\d+) (\d+)/);
      if (quarterParts) {
        const quarter = parseInt(quarterParts[1]);
        const year = parseInt(quarterParts[2]);
        date.setFullYear(year);
        date.setMonth((quarter - 1) * 3);
        date.setDate(1);
      }
      break;
    case 'yearly':
      date.setFullYear(parseInt(periodStr));
      date.setMonth(0);
      date.setDate(1);
      break;
    default:
      const defaultParts = periodStr.match(/([A-Za-z]+) (\d+)/);
      if (defaultParts) {
        const monthName = defaultParts[1];
        const year = parseInt(defaultParts[2]);
        const monthIndex = new Date(`${monthName} 1, 2000`).getMonth();
        date.setFullYear(year);
        date.setMonth(monthIndex);
        date.setDate(1);
      }
  }
  
  return date;
}

export { GET, POST };
