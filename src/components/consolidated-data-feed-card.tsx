
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Download, BarChartHorizontalBig, List } from 'lucide-react';
import html2canvas from 'html2canvas';
import MarketCardShell from './market-card-shell';
import MarketDataItem from './market-data-item';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getCryptoData, type CryptoData } from '@/services/crypto';
import { getMarketData, type MarketData } from '@/services/market';
import { getBondRateData, type BondRateData } from '@/services/bond-rate';
import { useInterval } from '@/hooks/use-interval';
import { useToast } from "@/hooks/use-toast";
import ConsolidatedDataGraph from './consolidated-data-graph';

export interface ConsolidatedDataItem {
  id: string;
  label: string;
  type: 'crypto' | 'market' | 'bond';
  data: CryptoData | MarketData | BondRateData | null;
  error?: boolean;
  symbol: string; // original symbol used for fetching
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

interface ConsolidatedDataFeedCardProps {
  onError?: () => void;
}

type ViewMode = 'cards' | 'graph';

const ConsolidatedDataFeedCard: React.FC<ConsolidatedDataFeedCardProps> = ({ onError }) => {
  const [data, setData] = useState<ConsolidatedDataItem[]>(initialItems.map(item => ({ ...item, data: null })));
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    let anErrorOccurred = false;
    try {
      const promises = initialItems.map(async (itemConfig): Promise<ConsolidatedDataItem> => {
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
          anErrorOccurred = true;
        }
        return { ...itemConfig, data: itemData, error };
      });
      const results = await Promise.all(promises);
      setData(results);
      if (anErrorOccurred) {
        onError?.();
      }
    } catch (error) {
      console.error('Error fetching consolidated data:', error);
      onError?.();
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useInterval(fetchData, 30000);

  const handleScreenshot = async () => {
    if (cardRef.current) {
      try {
        const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--background').trim() === '0 0% 87.8%' ? '#E0E0E0' : '#1A237E' });
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

  const isAnyDataAvailable = data.some(d => d.data && !d.error);

  return (
    <div ref={cardRef} className="bg-card p-4 rounded-lg shadow-lg">
      <MarketCardShell 
        title="Overview" 
        iconName="BarChart3" 
        isLoading={isLoading && !isAnyDataAvailable}
        headerChildren={
          <div className="flex items-center space-x-2">
            <List className={`h-5 w-5 ${viewMode === 'cards' ? 'text-primary' : 'text-muted-foreground'}`} />
            <Switch
              id="view-mode-toggle"
              checked={viewMode === 'graph'}
              onCheckedChange={(checked) => setViewMode(checked ? 'graph' : 'cards')}
              aria-label="Toggle view mode"
            />
            <BarChartHorizontalBig className={`h-5 w-5 ${viewMode === 'graph' ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
        }
      >
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                    value={(bond.rate * 100)} 
                    valueSuffix="%"
                    isLoading={isLoading && !item.data}
                  />
                );
              }
              return null;
            })}
          </div>
        ) : (
          <ConsolidatedDataGraph data={data} isLoading={isLoading && !isAnyDataAvailable} />
        )}
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
