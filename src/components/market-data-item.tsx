
"use client";

import type React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface MarketDataItemProps {
  label: string;
  value: string | number;
  change?: number;
  previousValueForPercentage?: number; // Used for calculating percentage change
  valuePrefix?: string;
  valueSuffix?: string;
  isLoading?: boolean;
  className?: string;
  periodLabel?: '24h' | 'YTD';
}

const MarketDataItem: React.FC<MarketDataItemProps> = ({
  label,
  value,
  change,
  previousValueForPercentage,
  valuePrefix = '',
  valueSuffix = '',
  isLoading = false,
  className,
  periodLabel,
}) => {
  const trend = change === undefined ? 'neutral' : change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
  const changeColor = trend === 'up' ? 'text-accent' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;

  let percentageChangeText = '';
  if (change !== undefined && typeof value === 'number') {
    const baseValue = previousValueForPercentage ?? (value - change); // Use provided previous value or calculate if not given
    if (baseValue !== 0) {
      const percentage = (change / baseValue) * 100;
      percentageChangeText = `(${percentage.toFixed(2)}%)`;
    } else if (change !== 0) {
      percentageChangeText = `(${change > 0 ? '∞' : '-∞'}%)`; // Handle division by zero if base was 0 but change occurred
    } else {
        percentageChangeText = '(0.00%)'; // No change from zero
    }
  }


  if (isLoading) {
    return (
      <div className={cn("py-2", className)}>
        <Skeleton className="h-5 w-24 mb-1" />
        <Skeleton className="h-6 w-32" />
        {change !== undefined && <Skeleton className="h-4 w-16 mt-1" />}
      </div>
    );
  }

  return (
    <div className={cn("py-2", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">
        {valuePrefix}
        {typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
        {valueSuffix}
      </p>
      {change !== undefined && (
        <p className={`text-xs font-medium flex items-center ${changeColor}`}>
          <TrendIcon className="h-3 w-3 mr-1" />
          {change.toFixed(2)} {percentageChangeText}
          {periodLabel && <span className="ml-1 text-xs text-muted-foreground">({periodLabel})</span>}
        </p>
      )}
    </div>
  );
};

export default MarketDataItem;
