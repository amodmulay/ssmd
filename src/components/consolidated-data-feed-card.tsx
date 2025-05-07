"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Landmark, Coins, Percent, Building2, BarChart3, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import MarketCardShell from './market-card-shell';
import MarketDataItem from './market-data-item';
import { Button } from '@/components/ui/button';
import { getCryptoData, type CryptoData } from '@/services/crypto';
import { getMarketData, type MarketData } from '@/services/market';
import { getBondRateData, type BondRateData } from '@/services/bond-rate';
import { useInterval } from '@/hooks/use-interval';
import { useToast } from "@/hooks/use-toast";

interface ConsolidatedDataItem {
  id: string;
  label: string;
  type: 'crypto' | 'market' | 'bond';
  data: CryptoData | MarketData | BondRateData | null;
  error?: boolean;
}

const initialItems: { id: string; label: string; type: 'crypto' | 'market' | 'bond'; symbol: string }[] = [
  { id: 'btc', label: 'Bitcoin (BTC)', type: 'crypto', symbol: 'BTC' },
  { id: 'eth', label: 'Ethereum (ETH)', type: 'crypto', symbol: 'ETH' },
  { id: 'sp500', label: 'S&P 500', type: 'market', symbol: 'S&P 500' },
  { id: 'nasdaq', label: 'NASDAQ', type: 'market', symbol: 'NASDAQ' },
  { id: 'shanghai', label: 'Shanghai Comp.', type: 'market', symbol: 'Shanghai Composite' },
  { id: 'nifty', label: 'Nifty 50 (India)', type: 'market', symbol: 'Nifty 50' },
  { id: 'nikkei', label: 'Nikkei 225 (Japan)', type: 'market', symbol: 'Nikkei 225' },
  { id: 'hangseng', label: 'Hang Seng (HK)', type: 'market', symbol: 'Hang Seng' },
  { id: 'sti', label: 'STI (Singapore)', type: 'market', symbol: 'STI' },
  { id: 'us10yr', label: 'US 10Y Bond', type: 'bond', symbol: 'US 10-Year Treasury' },
];

const ConsolidatedDataFeedCard: React.FC = () => {
  const [data, setData] = useState<ConsolidatedDataItem[]>(initialItems.map(item => ({ ...item, data: null })));
  const [isLoading, setIsLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const promises = initialItems.map(async (itemConfig) => {
        let itemData: CryptoData | MarketData | BondRateData | null = null;
        let error = false;
        try {
          if (itemConfig.type === 'crypto') {
            itemData = await getCryptoData(itemConfig.symbol);
          } else if (itemConfig.type === 'market') {
            itemData = await getMarketData(itemConfig.symbol);
          } else if (itemConfig.type === 'bond') {
            itemData = await getBondRateData(itemConfig.symbol);
          }
        } catch (e) {
          console.error(`Error fetching data for ${itemConfig.label}:`, e);
          error = true;
        }
        return { ...itemConfig, data: itemData, error };
      });
      const results = await Promise.all(promises);
      setData(results);
    } catch (error) {
      console.error('Error fetching consolidated data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useInterval(fetchData, 30000);

  const handleScreenshot = async () => {
    if (cardRef.current) {
      try {
        const canvas = await html2canvas(cardRef.current, { scale: 2 }); // Increase scale for better quality
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = 'marketwatch-lite-snapshot.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Screenshot Saved!", description: "Snapshot downloaded as marketwatch-lite-snapshot.png" });
      } catch (error) {
        console.error("Error taking screenshot:", error);
        toast({ variant: "destructive", title: "Screenshot Failed", description: "Could not generate screenshot." });
      }
    }
  };

  return (
    <div ref={cardRef}>
      <MarketCardShell title="Consolidated View" icon={BarChart3} isLoading={isLoading && !data.some(d=>d.data)} contentClassName="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {data.map((item) => {
          if (item.error || !item.data) {
            return <MarketDataItem key={item.id} label={item.label} value={item.error ? "Error" : "N/A"} isLoading={isLoading && !item.data} />;
          }
          if (item.type === 'crypto' && item.data) {
            const crypto = item.data as CryptoData;
            return (
              <MarketDataItem
                key={item.id}
                label={item.label}
                value={crypto.price}
                change={crypto.priceChange24h}
                valuePrefix="$"
                isLoading={isLoading && !item.data}
              />
            );
          } else if (item.type === 'market' && item.data) {
            const market = item.data as MarketData;
            return (
              <MarketDataItem
                key={item.id}
                label={item.label}
                value={market.value}
                change={market.change}
                isLoading={isLoading && !item.data}
              />
            );
          } else if (item.type === 'bond' && item.data) {
            const bond = item.data as BondRateData;
            return (
              <MarketDataItem
                key={item.id}
                label={item.label}
                value={(bond.rate * 100)} // Display as percentage
                valueSuffix="%"
                isLoading={isLoading && !item.data}
              />
            );
          }
          return null;
        })}
      </MarketCardShell>
      <div className="mt-4 flex justify-end">
        <Button onClick={handleScreenshot} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Screenshot
        </Button>
      </div>
    </div>
  );
};

export default ConsolidatedDataFeedCard;
