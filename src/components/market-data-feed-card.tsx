"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import MarketCardShell from './market-card-shell';
import MarketDataItem from './market-data-item';
import { getCryptoData, type CryptoData } from '@/services/crypto';
import { getMarketData, type MarketData } from '@/services/market';
import { useInterval } from '@/hooks/use-interval';

type MarketType = 'crypto' | 'us' | 'eu' | 'asia';

interface MarketDataFeedCardProps {
  title: string;
  icon?: LucideIcon;
  marketType: MarketType;
  symbols: string[]; // e.g., ['BTC', 'ETH'] or ['S&P 500', 'NASDAQ']
  className?: string;
}

type FetchedData = CryptoData | MarketData;

const MarketDataFeedCard: React.FC<MarketDataFeedCardProps> = ({ title, icon, marketType, symbols, className }) => {
  const [data, setData] = useState<(FetchedData & { id: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const promises = symbols.map(async (symbol) => {
        let result: FetchedData;
        if (marketType === 'crypto') {
          result = await getCryptoData(symbol);
        } else {
          result = await getMarketData(symbol);
        }
        return { ...result, id: symbol };
      });
      const results = await Promise.all(promises);
      setData(results);
    } catch (error) {
      console.error(`Error fetching ${marketType} data:`, error);
      // Optionally set an error state to display in UI
    } finally {
      setIsLoading(false);
    }
  }, [marketType, symbols]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useInterval(fetchData, 30000); // Update every 30 seconds

  return (
    <MarketCardShell title={title} icon={icon} isLoading={isLoading && data.length === 0} className={className} contentClassName="grid grid-cols-1 md:grid-cols-2 gap-4">
      {isLoading && data.length === 0 ? (
        // Skeleton handled by MarketCardShell if data is empty and loading
        // If data exists but is refreshing, MarketDataItems will show their own skeletons
        symbols.map(symbol => (
            <MarketDataItem key={symbol} label={symbol} value="" isLoading={true} />
        ))
      ) : (
        data.map((item) => {
          if ('price' in item) { // CryptoData
            return (
              <MarketDataItem
                key={item.id}
                label={item.symbol}
                value={item.price}
                change={item.priceChange24h}
                valuePrefix="$"
                isLoading={isLoading}
              />
            );
          } else { // MarketData
            return (
              <MarketDataItem
                key={item.id}
                label={item.name}
                value={item.value}
                change={item.change}
                isLoading={isLoading}
              />
            );
          }
        })
      )}
    </MarketCardShell>
  );
};

export default MarketDataFeedCard;
