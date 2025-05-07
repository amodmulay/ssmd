
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Download, CalendarClock, Clock } from 'lucide-react';
import html2canvas from 'html2canvas';
import MarketCardShell from './market-card-shell';
import MarketDataItem from './market-data-item';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getCryptoData, type CryptoPeriodData } from '@/services/crypto';
import { getMarketData, type MarketPeriodData } from '@/services/market';
import { getBondRateData, type BondRatePeriodData } from '@/services/bond-rate';
import { useInterval } from '@/hooks/use-interval';
import { useToast } from "@/hooks/use-toast";

export interface ProcessedConsolidatedDataItem {
  id: string;
  label: string;
  type: 'crypto' | 'market' | 'bond';
  symbol: string; // original symbol
  data: {
    current: number;
    previous: number;
  } | null;
  valuePrefix?: string;
  valueSuffix?: string;
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

interface ConsolidatedDataFeedCardProps {
  onError?: () => void;
}

type DataPeriod = '24h' | 'ytd';

const ConsolidatedDataFeedCard: React.FC<ConsolidatedDataFeedCardProps> = ({ onError }) => {
  const [data, setData] = useState<ProcessedConsolidatedDataItem[]>(initialItems.map(item => ({ ...item, data: null })));
  const [isLoading, setIsLoading] = useState(true);
  const [dataPeriod, setDataPeriod] = useState<DataPeriod>('24h');
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    let anErrorOccurred = false;
    try {
      const promises = initialItems.map(async (itemConfig): Promise<ProcessedConsolidatedDataItem> => {
        let itemData: { current: number; previous: number } | null = null;
        let error = false;
        let valuePrefix: string | undefined = undefined;
        let valueSuffix: string | undefined = undefined;

        try {
          if (itemConfig.type === 'crypto') {
            const fetched = await getCryptoData(itemConfig.symbol, dataPeriod);
            itemData = { current: fetched.currentPrice, previous: fetched.previousPrice };
            valuePrefix = '$';
          } else if (itemConfig.type === 'market') {
            const fetched = await getMarketData(itemConfig.symbol, dataPeriod);
            itemData = { current: fetched.currentValue, previous: fetched.previousValue };
          } else if (itemConfig.type === 'bond') {
            const fetched = await getBondRateData(itemConfig.symbol, dataPeriod);
            itemData = { current: fetched.currentRate * 100, previous: fetched.previousRate * 100 }; // Convert to percentage points
            valueSuffix = '%';
          }
        } catch (e) {
          console.error(`Error fetching data for ${itemConfig.label} (${dataPeriod}):`, e);
          error = true;
          anErrorOccurred = true;
        }
        return { ...itemConfig, data: itemData, error, valuePrefix, valueSuffix };
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
  }, [onError, dataPeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]); // Refetch when dataPeriod changes

  useInterval(fetchData, 30000); // Interval remains for auto-refresh

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
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Clock className={`h-4 w-4 ${dataPeriod === '24h' ? 'text-primary' : 'text-muted-foreground'}`} />
              <Label htmlFor="period-toggle" className="text-xs text-muted-foreground sr-only">Period</Label>
              <Switch
                id="period-toggle"
                checked={dataPeriod === 'ytd'}
                onCheckedChange={(checked) => setDataPeriod(checked ? 'ytd' : '24h')}
                aria-label="Toggle data period between 24 hours and Year-to-Date"
              />
              <CalendarClock className={`h-4 w-4 ${dataPeriod === 'ytd' ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {data.map((item) => {
            if (item.error || !item.data) {
              return <MarketDataItem key={item.id} label={item.label} value={item.error ? "Error" : "N/A"} isLoading={isLoading && !item.data} />;
            }
            const change = item.data.current - item.data.previous;
            return (
              <MarketDataItem
                key={item.id}
                label={item.label}
                value={item.data.current}
                change={change}
                previousValueForPercentage={item.data.previous}
                valuePrefix={item.valuePrefix}
                valueSuffix={item.valueSuffix}
                isLoading={isLoading && !item.data}
                periodLabel={dataPeriod === 'ytd' ? 'YTD' : '24h'}
              />
            );
          })}
        </div>
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
