"use client";

import type { FC } from 'react';
import { useEffect, useState, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getCryptoData, type CryptoData } from '@/services/crypto';
import { getForexData, type ForexData } from '@/services/forex';
import { ArrowUpRight, ArrowDownRight, Minus, AlertCircle } from 'lucide-react';

interface MarketDataFeedCardProps {
  title: string;
  iconName: string; // Changed from LucideIcon to string
  marketType: 'crypto' | 'forex';
  symbols: string[];
  showYTD: boolean;
}

type CombinedData = CryptoData | ForexData;

// Dynamically import Lucide icons
const iconComponents: { [key: string]: LucideIcon } = {
  Coins: require('lucide-react').Coins,
  Landmark: require('lucide-react').Landmark,
  // Add other icons here as needed
};


const MarketDataFeedCard: FC<MarketDataFeedCardProps> = ({ title, iconName, marketType, symbols, showYTD }) => {
  const [data, setData] = useState<CombinedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const symbolsKey = useMemo(() => symbols.join(','), [symbols]);
  const Icon = iconComponents[iconName] || AlertCircle; // Fallback icon

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        let fetchedData: CombinedData[] = [];
        const currentPeriod = showYTD ? 'ytd' : '24h';

        if (marketType === 'crypto') {
          const cryptoPromises = symbols.map(symbol => getCryptoData(symbol, currentPeriod));
          fetchedData = (await Promise.all(cryptoPromises)).filter(d => d !== null) as CryptoData[];
        } else if (marketType === 'forex') {
          const forexPromises = symbols.map(symbol => getForexData(symbol, currentPeriod));
          fetchedData = (await Promise.all(forexPromises)).filter(d => d !== null) as ForexData[];
        }
        setData(fetchedData);
      } catch (err) {
        console.error(`Error fetching ${marketType} data:`, err);
        setError(`Failed to load ${marketType} data. API might be down, key invalid, or rate limited.`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, showYTD ? 3600000 : 60000); // Refresh less often for YTD
    return () => clearInterval(intervalId);
  }, [marketType, symbolsKey, showYTD, symbols]); 

  const renderPriceChange = (priceChange: number | undefined) => {
    if (priceChange === undefined) {
      return <span className="text-muted-foreground">N/A</span>;
    }
    const isPositive = priceChange > 0;
    const isNegative = priceChange < 0;
    const IconComponent = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : Minus;
    const colorClass = isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-muted-foreground';

    return (
      <span className={`flex items-center ${colorClass}`}>
        <IconComponent className="h-4 w-4 mr-1" />
        {priceChange.toFixed(2)}%
      </span>
    );
  };


  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold text-primary flex items-center">
          <Icon className="h-6 w-6 mr-2 text-accent" />
          {title}
        </CardTitle>
        <Badge variant={showYTD ? "secondary" : "outline"}>{showYTD ? 'YTD' : '24h'}</Badge>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {!loading && !error && data.length === 0 && (
           <Alert variant="default">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Data</AlertTitle>
            <AlertDescription>No data available for the selected symbols.</AlertDescription>
          </Alert>
        )}
        {!loading && !error && data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Change ({showYTD ? 'YTD' : '24h'})</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => {
                const name = 'name' in item ? item.name : item.symbol;
                const currentPrice = 'current_price' in item ? item.current_price : item.price;
                const priceChange = 'price_change_percentage_24h' in item 
                                      ? (showYTD ? (item.price_change_percentage_ytd_in_currency ?? item.price_change_percentage_24h) : item.price_change_percentage_24h)
                                      : item.changesPercentage;
                return (
                  <TableRow key={name}>
                    <TableCell className="font-medium">
                      {name.length > 10 ? name.substring(0,10) + "..." : name}
                    </TableCell>
                    <TableCell className="text-right">${currentPrice !== undefined ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: marketType === 'crypto' ? 8 : 4 }) : 'N/A'}</TableCell>
                    <TableCell className="text-right">{renderPriceChange(priceChange)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default MarketDataFeedCard;
