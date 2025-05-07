
"use client";

import type React from 'react';
import { Line, LineChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { ChartContainer } from '@/components/ui/chart';
import type { ProcessedConsolidatedDataItem } from './consolidated-data-feed-card';
import { Skeleton } from '@/components/ui/skeleton';

interface ConsolidatedDataGraphProps {
  data: ProcessedConsolidatedDataItem[];
  isLoading: boolean;
  dataPeriod: '24h' | 'ytd';
}

interface ChartDataPoint {
  name: string; // label of the item
  percentChange?: number; // for crypto and markets
  currentValue?: number; // for bonds (rate) or market/crypto (price/value)
  tooltipValue?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}

const chartConfigBase = {
  percentChange: {
    label: '% Change', // Will be appended with (24h) or (YTD)
    color: 'hsl(var(--chart-1))',
  },
  currentValueRate: { // Specifically for bond rates
    label: 'Rate (%)',
    color: 'hsl(var(--chart-2))',
  },
  currentValueMarket: { // For market indices
    label: 'Index Value',
    color: 'hsl(var(--chart-3))',
  },
  currentValueCrypto: { // For crypto prices
    label: 'Price (USD)',
    color: 'hsl(var(--chart-4))',
  },
} satisfies ChartConfig;


const ConsolidatedDataGraph: React.FC<ConsolidatedDataGraphProps> = ({ data, isLoading, dataPeriod }) => {
  if (isLoading) {
    return (
      <div className="w-full h-[400px] p-4">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }
  
  const dynamicChartConfig = {
    ...chartConfigBase,
    percentChange: {
      ...chartConfigBase.percentChange,
      label: `% Change (${dataPeriod.toUpperCase()})`,
    }
  };

  const processedChartData: ChartDataPoint[] = data
    .map((item) => {
      if (item.error || !item.data) {
        return { name: item.label, tooltipValue: item.error ? 'Error' : 'N/A' };
      }

      const { current, previous } = item.data;
      let percentChange: number | undefined = undefined;
      if (previous !== 0) {
        percentChange = ((current - previous) / previous) * 100;
      } else if (current !== previous) { // current is non-zero, previous was zero
        percentChange = current > 0 ? Infinity : -Infinity;
      } else { // current is zero, previous was zero
        percentChange = 0;
      }
      
      const finitePercentChange = Number.isFinite(percentChange) ? percentChange : undefined;

      let tooltipValue = `${item.valuePrefix || ''}${current.toFixed(2)}${item.valueSuffix || ''}`;
      if (finitePercentChange !== undefined) {
        tooltipValue += ` (${finitePercentChange.toFixed(2)}% ${dataPeriod.toUpperCase()})`;
      }


      if (item.type === 'bond') { // Bonds primarily show rate, not % change on primary Y-axis
        return {
          name: item.label,
          currentValue: current, // This is already in % points
          percentChange: finitePercentChange, // still calculate for tooltip/secondary axis if needed
          tooltipValue: `${current.toFixed(2)}% Rate` + (finitePercentChange !== undefined ? ` (${finitePercentChange.toFixed(2)}% ${dataPeriod.toUpperCase()})` : ''),
          valueSuffix: '%'
        };
      }
      
      // For crypto and markets, primary focus is percent change
      return {
        name: item.label,
        percentChange: finitePercentChange,
        currentValue: current, // Store current value for tooltip or potential secondary axis
        tooltipValue: tooltipValue,
        valuePrefix: item.valuePrefix,
        valueSuffix: item.valueSuffix,
      };
    })
    .filter((item): item is ChartDataPoint => item !== null);

  if (!processedChartData.length) {
    return <div className="text-center p-4">No data available to display graph.</div>;
  }
  
  // Dynamic Y-axis domain based on data, with some padding
  const percentChanges = processedChartData.map(d => d.percentChange).filter(pc => pc !== undefined && isFinite(pc)) as number[];
  const minPc = percentChanges.length > 0 ? Math.min(...percentChanges) : -10;
  const maxPc = percentChanges.length > 0 ? Math.max(...percentChanges) : 10;
  const pcPadding = Math.max(1, Math.abs(maxPc - minPc) * 0.1);
  const yAxisDomainPercent = [Math.floor(minPc - pcPadding), Math.ceil(maxPc + pcPadding)];

  const bondRates = processedChartData.filter(d => d.valueSuffix === '%').map(d => d.currentValue).filter(r => r !== undefined) as number[];
  const minRate = bondRates.length > 0 ? Math.min(...bondRates) : 0;
  const maxRate = bondRates.length > 0 ? Math.max(...bondRates) : 5;
  const ratePadding = Math.max(0.5, Math.abs(maxRate - minRate) * 0.1);
  const yAxisDomainRate = [Math.max(0, Math.floor(minRate - ratePadding)), Math.ceil(maxRate + ratePadding)];


  return (
    <ChartContainer config={dynamicChartConfig} className="min-h-[300px] w-full aspect-video">
      <LineChart accessibilityLayer data={processedChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
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
          yAxisId="left" // For percent change
          orientation="left"
          stroke="hsl(var(--foreground))"
          tickFormatter={(value) => `${value}%`}
          domain={yAxisDomainPercent}
        />
        <YAxis
          yAxisId="right" // For bond rates
          orientation="right"
          stroke="hsl(var(--foreground))"
          tickFormatter={(value) => `${value}%`}
          domain={yAxisDomainRate}
        />
        <Tooltip
            content={({ active, payload }) => {
            if (active && payload && payload.length) {
              // payload can have multiple entries if multiple lines share an x-axis point
              // We assume the first one is representative enough for the label, or customize as needed
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
          dataKey="percentChange" // Used for crypto and markets
          stroke="var(--color-percentChange)"
          strokeWidth={2}
          dot={false}
          yAxisId="left"
          name={dynamicChartConfig.percentChange.label as string}
          connectNulls={false} // Don't connect if percentChange is undefined (e.g. for bonds if not desired)
        />
        <Line
          type="monotone"
          dataKey={(data) => data.valueSuffix === '%' ? data.currentValue : undefined} // Only plot for bonds
          stroke="var(--color-currentValueRate)"
          strokeWidth={2}
          dot={false}
          yAxisId="right"
          name={dynamicChartConfig.currentValueRate.label as string}
          connectNulls={false}
        />
      </LineChart>
    </ChartContainer>
  );
};

export default ConsolidatedDataGraph;
