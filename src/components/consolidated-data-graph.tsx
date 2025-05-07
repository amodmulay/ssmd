
"use client";

import type React from 'react';
import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { CryptoData } from '@/services/crypto';
import type { MarketData } from '@/services/market';
import type { BondRateData } from '@/services/bond-rate';
import type { ConsolidatedDataItem } from './consolidated-data-feed-card';
import { Skeleton } from '@/components/ui/skeleton';

interface ConsolidatedDataGraphProps {
  data: ConsolidatedDataItem[];
  isLoading: boolean;
}

interface ChartDataPoint {
  name: string;
  percentChange?: number;
  currentRate?: number;
  tooltipValue?: string;
}

const chartConfig = {
  percentChange: {
    label: '% Change (24h)',
    color: 'hsl(var(--chart-1))',
  },
  currentRate: {
    label: 'Current Rate (%)',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

const ConsolidatedDataGraph: React.FC<ConsolidatedDataGraphProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="w-full h-[400px] p-4">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  const processedChartData: ChartDataPoint[] = data
    .map((item) => {
      if (item.error || !item.data) {
        return { name: item.label, tooltipValue: item.error ? 'Error' : 'N/A' };
      }

      if (item.type === 'crypto' && item.data) {
        const crypto = item.data as CryptoData;
        const price = crypto.price;
        const change = crypto.priceChange24h;
        let pcValue: number | undefined;
        const prevPrice = price - change;
        if (prevPrice !== 0) {
          pcValue = (change / prevPrice) * 100;
        } else if (change !== 0) {
          pcValue = change > 0 ? Infinity : -Infinity;
        } else {
          pcValue = 0;
        }
        return {
          name: item.label,
          percentChange: Number.isFinite(pcValue) ? pcValue : undefined,
          tooltipValue: `${(pcValue ?? 0).toFixed(2)}% (24h) | $${price.toFixed(2)}`,
        };
      } else if (item.type === 'market' && item.data) {
        const market = item.data as MarketData;
        const value = market.value;
        const change = market.change;
        let pcValue: number | undefined;
        const prevValue = value - change;
         if (prevValue !== 0) {
          pcValue = (change / prevValue) * 100;
        } else if (change !== 0) {
          pcValue = change > 0 ? Infinity : -Infinity;
        } else {
          pcValue = 0;
        }
        return {
          name: item.label,
          percentChange: Number.isFinite(pcValue) ? pcValue : undefined,
          tooltipValue: `${(pcValue ?? 0).toFixed(2)}% | ${value.toFixed(2)} pts`,
        };
      } else if (item.type === 'bond' && item.data) {
        const bond = item.data as BondRateData;
        const rate = bond.rate * 100;
        return {
          name: item.label,
          currentRate: rate,
          tooltipValue: `${rate.toFixed(2)}% Rate`,
        };
      }
      return null;
    })
    .filter((item): item is ChartDataPoint => item !== null);

  if (!processedChartData.length) {
    return <div className="text-center p-4">No data available to display graph.</div>;
  }
  
  const yAxisDomain = [-10, 10]; // Default domain for percent change

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full aspect-video">
      <LineChart accessibilityLayer data={processedChartData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          angle={-45}
          textAnchor="end"
          height={70} 
          interval={0} 
          tickFormatter={(value) => value.length > 15 ? `${value.substring(0,12)}...` : value}
        />
        <YAxis
          yAxisId="left"
          orientation="left"
          stroke="hsl(var(--foreground))"
          tickFormatter={(value) => `${value}%`}
          domain={yAxisDomain} // Adjust domain as needed, or let it be auto
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="hsl(var(--foreground))"
          tickFormatter={(value) => `${value}%`}
          domain={[0, 'dataMax + 2']} // Domain for bond rates, typically 0 to ~10%
        />
        <Tooltip
            content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const dataPoint = payload[0].payload as ChartDataPoint;
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid grid-cols-1 gap-1.5">
                    <span className="font-semibold">{dataPoint.name}</span>
                    <span className="text-sm text-muted-foreground">{dataPoint.tooltipValue}</span>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="percentChange"
          stroke="var(--color-percentChange)"
          strokeWidth={2}
          dot={false}
          yAxisId="left"
          name="% Change (24h)"
        />
        <Line
          type="monotone"
          dataKey="currentRate"
          stroke="var(--color-currentRate)"
          strokeWidth={2}
          dot={false}
          yAxisId="right"
          name="Current Rate (%)"
        />
      </LineChart>
    </ChartContainer>
  );
};

export default ConsolidatedDataGraph;

