
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import MarketCardShell from './market-card-shell';
import MarketDataItem from './market-data-item';
import { getCryptoData, type CryptoPeriodData } from '@/services/crypto';
import { getMarketData, type MarketPeriodData } from '@/services/market';
import { useInterval } from '@/hooks/use-interval';

type MarketType = 'crypto' | 'us' | 'eu' | 'asia';

interface MarketDataFeedCardProps {
  title: string;
  iconName?: string;
  marketType: MarketType;
  symbols: string[];
  className?: string;
  onError?: () => void;
}

interface ProcessedFeedItem {
  id: string; // symbol
  label: string; // display name
  symbol: string; // original symbol for display
  data: {
    current: number;
    previous: number;
  } | null;
  valuePrefix?: string;
  error?: boolean;
}


const MarketDataFeedCard: React.FC<MarketDataFeedCardProps> = ({ title, iconName, marketType, symbols, className, onError }) => {
  const [data, setData] = useState<ProcessedFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    let anErrorOccurred = false;
    try {
      const promises = symbols.map(async (symbol): Promise<ProcessedFeedItem> => {
        let itemData: { current: number; previous: number } | null = null;
        let error = false;
        let valuePrefix: string | undefined = undefined;
        let fetchedLabel = symbol; // default label to symbol

        try {
          if (marketType === 'crypto') {
            const result: CryptoPeriodData = await getCryptoData(symbol, '24h');
            itemData = { current: result.currentPrice, previous: result.previousPrice };
            valuePrefix = '$';
            fetchedLabel = result.symbol; // Use the symbol from the data if formatted
          } else { // 'us', 'eu', 'asia' markets
            const result: MarketPeriodData = await getMarketData(symbol, '24h');
            itemData = { current: result.currentValue, previous: result.previousValue };
            fetchedLabel = result.name; // Use the name from the data
          }
        } catch (e) {
          console.error(`Error fetching 24h data for ${symbol} in ${marketType} card:`, e);
          error = true;
          anErrorOccurred = true;
        }
        return { id: symbol, label: fetchedLabel, symbol: symbol, data: itemData, error, valuePrefix };
      });
      const results = await Promise.all(promises);
      setData(results);
      if (anErrorOccurred) {
        onError?.();
      }
    } catch (error) {
      console.error(`Overall error processing ${marketType} data:`, error);
      onError?.();
    } finally {
      setIsLoading(false);
    }
  }, [marketType, symbols, onError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useInterval(fetchData, 30000); // Update every 30 seconds

  return (
    <MarketCardShell title={title} iconName={iconName} isLoading={isLoading && data.length === 0} className={className} contentClassName="grid grid-cols-1 md:grid-cols-2 gap-4">
      {isLoading && data.length === 0 ? (
        symbols.map(symbol => (
            <MarketDataItem key={symbol} label={symbol} value="Loading..." isLoading={true} />
        ))
      ) : (
        data.map((item) => {
          if (item.error || !item.data) {
            return (
              <MarketDataItem
                key={item.id}
                label={item.label} // Use the potentially updated label
                value="Error"
                isLoading={false}
              />
            );
          }
          const change = item.data.current - item.data.previous;
          return (
            <MarketDataItem
              key={item.id}
              label={item.label} // Use the potentially updated label
              value={item.data.current}
              change={change}
              previousValueForPercentage={item.data.previous}
              valuePrefix={item.valuePrefix}
              isLoading={isLoading && !item.data}
              periodLabel="24h" // These cards always show 24h
            />
          );
        })
      )}
    </MarketCardShell>
  );
};

export default MarketDataFeedCard;
