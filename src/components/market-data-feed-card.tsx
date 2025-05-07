
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import MarketCardShell from './market-card-shell';
import MarketDataItem from './market-data-item';
import { getCryptoData, type CryptoData } from '@/services/crypto';
import { getMarketData, type MarketData } from '@/services/market';
import { useInterval } from '@/hooks/use-interval';

type MarketType = 'crypto' | 'us' | 'eu' | 'asia';

interface MarketDataFeedCardProps {
  title: string;
  iconName?: string;
  marketType: MarketType;
  symbols: string[];
  className?: string;
}

// Define specific types for successful and errored items
interface SuccessfulCryptoItem extends CryptoData {
  id: string; // Typically the symbol
  error?: false;
}

interface SuccessfulMarketItem extends MarketData {
  id: string; // Typically the symbol
  error?: false;
}

interface ErroredItem {
  id: string; // The symbol that failed
  error: true;
  label: string; // Display label for the errored item
  // Ensure no 'price' or 'value' properties to avoid type guard confusion
  price?: undefined;
  value?: undefined;
  symbol?: string; // Store original symbol for context
  name?: string; // Store original name for context
}

type ProcessedDataItem = SuccessfulCryptoItem | SuccessfulMarketItem | ErroredItem;


const MarketDataFeedCard: React.FC<MarketDataFeedCardProps> = ({ title, iconName, marketType, symbols, className }) => {
  const [data, setData] = useState<ProcessedDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const promises = symbols.map(async (symbol): Promise<ProcessedDataItem> => {
        try {
          if (marketType === 'crypto') {
            const result = await getCryptoData(symbol);
            return { ...result, id: symbol, error: false };
          } else {
            const result = await getMarketData(symbol);
            return { ...result, id: symbol, error: false };
          }
        } catch (e) {
          console.error(`Error fetching data for ${symbol} in ${marketType} card:`, e);
          return { id: symbol, error: true, label: symbol, symbol: symbol, name: symbol };
        }
      });
      const results = await Promise.all(promises);
      setData(results);
    } catch (error) {
      // This catch is for errors in Promise.all itself or setData, less likely with individual error handling.
      console.error(`Overall error processing ${marketType} data:`, error);
      // If a catastrophic error occurs, set all items to an error state or a general card error.
      // For simplicity, current implementation relies on individual error states.
    } finally {
      setIsLoading(false);
    }
  }, [marketType, symbols]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useInterval(fetchData, 30000); // Update every 30 seconds

  return (
    <MarketCardShell title={title} iconName={iconName} isLoading={isLoading && data.length === 0} className={className} contentClassName="grid grid-cols-1 md:grid-cols-2 gap-4">
      {isLoading && data.length === 0 ? (
        // Show skeletons for each symbol while initial data is loading
        symbols.map(symbol => (
            <MarketDataItem key={symbol} label={symbol} value="Loading..." isLoading={true} />
        ))
      ) : (
        data.map((item) => {
          if (item.error === true) {
            return (
              <MarketDataItem
                key={item.id}
                label={item.label}
                value="Error"
                isLoading={false} // Error state means loading is complete for this item
              />
            );
          }
          // If not an error, item is either SuccessfulCryptoItem or SuccessfulMarketItem
          if ('price' in item && typeof item.price === 'number') { // CryptoData
            const cryptoItem = item as SuccessfulCryptoItem;
            return (
              <MarketDataItem
                key={cryptoItem.id}
                label={cryptoItem.symbol}
                value={cryptoItem.price}
                change={cryptoItem.priceChange24h}
                valuePrefix="$"
                isLoading={isLoading && !cryptoItem.price} // Show loading if card is refreshing and this specific item doesn't have data yet.
              />
            );
          } else if ('value' in item && typeof item.value === 'number') { // MarketData
            const marketItem = item as SuccessfulMarketItem;
            return (
              <MarketDataItem
                key={marketItem.id}
                label={marketItem.name}
                value={marketItem.value}
                change={marketItem.change}
                isLoading={isLoading && !marketItem.value}
              />
            );
          }
          // Fallback for unexpected item structure, though types should prevent this
          return <MarketDataItem key={item.id} label={item.id} value="N/A" isLoading={false} />;
        })
      )}
    </MarketCardShell>
  );
};

export default MarketDataFeedCard;
