"use client";

import type React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface MarketDataItemProps {
  label: string;
  value: string | number;
  change?: number;
  valuePrefix?: string;
  valueSuffix?: string;
  isLoading?: boolean;
  className?: string;
}

const MarketDataItem: React.FC<MarketDataItemProps> = ({
  label,
  value,
  change,
  valuePrefix = '',
  valueSuffix = '',
  isLoading = false,
  className,
}) => {
  const trend = change === undefined ? 'neutral' : change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
  const changeColor = trend === 'up' ? 'text-accent' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;

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
        <p className={`text-sm font-medium flex items-center ${changeColor}`}>
          <TrendIcon className="h-4 w-4 mr-1" />
          {change.toFixed(2)} ({((change / (Number(value) - change)) * 100).toFixed(2)}%)
        </p>
      )}
    </div>
  );
};

export default MarketDataItem;
