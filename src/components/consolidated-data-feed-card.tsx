
"use client";
import type { FC } from 'react';
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Minus, AlertCircle, DollarSign, Coins, Landmark } from 'lucide-react';
import { getCryptoData, type CryptoData } from '@/services/crypto';
import { getForexData, type ForexData } from '@/services/forex';
import { Badge } from '@/components/ui/badge';

interface ConsolidatedDataFeedCardProps {
  title: string;
  cryptoSymbols: string[];
  forexSymbols: string[];
  showYTD: boolean;
}

type CombinedData = CryptoData | ForexData;

const ConsolidatedDataFeedCard: FC<ConsolidatedDataFeedCardProps> = ({ title, cryptoSymbols, forexSymbols, showYTD }) => {
  const [data, setData] = useState<CombinedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cryptoSymbolsKey = useMemo(() => cryptoSymbols.join(','), [cryptoSymbols]);
  const forexSymbolsKey = useMemo(() => forexSymbols.join(','), [forexSymbols]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const currentPeriod = showYTD ? 'ytd' : '24h';
        const cryptoPromises = cryptoSymbols.map(symbol => getCryptoData(symbol, currentPeriod));
        const forexPromises = forexSymbols.map(symbol => getForexData(symbol, currentPeriod));

        const [cryptoResults, forexResults] = await Promise.all([
          Promise.all(cryptoPromises),
          Promise.all(forexPromises)
        ]);

        const fetchedData = [
          ...cryptoResults.filter(d => d !== null) as CryptoData[],
          ...forexResults.filter(d => d !== null) as ForexData[]
        ];
        
        setData(fetchedData);
      } catch (err) {
        console.error('Error fetching consolidated data:', err);
        setError('Failed to load consolidated market data. APIs might be down or keys invalid.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 60000); // Refresh every 60 seconds
    return () => clearInterval(intervalId);
  }, [cryptoSymbolsKey, forexSymbolsKey, showYTD, cryptoSymbols, forexSymbols]);


  const overallSentiment = useMemo(() => {
    if (data.length === 0) return 'neutral';
    const changes = data.map(item => 
        'price_change_percentage_24h' in item 
            ? (showYTD ? (item.price_change_percentage_ytd_in_currency ?? item.price_change_percentage_24h) : item.price_change_percentage_24h)
            : (showYTD ? (item.ytdChangePercentage ?? item.changesPercentage) : item.changesPercentage)
    ).filter(change => typeof change === 'number') as number[];
    
    if (changes.length === 0) return 'neutral';
    const averageChange = changes.reduce((acc, curr) => acc + curr, 0) / changes.length;
    if (averageChange > 0.1) return 'positive';
    if (averageChange < -0.1) return 'negative';
    return 'neutral';
  }, [data, showYTD]);

  const SentimentIcon = overallSentiment === 'positive' ? TrendingUp : overallSentiment === 'negative' ? TrendingDown : Minus;
  const sentimentColor = overallSentiment === 'positive' ? 'text-green-500' : overallSentiment === 'negative' ? 'text-red-500' : 'text-muted-foreground';

  return (
    <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300 bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold text-primary flex items-center">
          <DollarSign className="h-7 w-7 mr-3 text-accent" />
          {title}
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Badge variant={showYTD ? "secondary" : "outline"} className="text-sm">{showYTD ? 'YTD' : '24h'}</Badge>
          <SentimentIcon className={`h-7 w-7 ${sentimentColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-2 bg-card rounded-lg shadow-md border border-border/50 min-h-[90px] flex flex-col justify-between">
                <div>
                  <Skeleton className="h-4 w-20 mb-1" /> {/* For name + icon */}
                  <Skeleton className="h-5 w-24 mb-1" /> {/* For price */}
                </div>
                <Skeleton className="h-4 w-16 self-start mt-1" /> {/* For change % */}
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
            <AlertDescription>No data available for the selected symbols in the overview.</AlertDescription>
          </Alert>
        )}
        {!loading && !error && data.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {data.map((item) => {
              const name = 'name' in item ? item.name : item.symbol;
              const isCrypto = 'current_price' in item;
              const currentPrice = isCrypto ? (item as CryptoData).current_price : (item as ForexData).price;
              
              const priceChange = isCrypto
                                    ? (showYTD ? ((item as CryptoData).price_change_percentage_ytd_in_currency ?? (item as CryptoData).price_change_percentage_24h) : (item as CryptoData).price_change_percentage_24h)
                                    : (showYTD ? ((item as ForexData).ytdChangePercentage ?? (item as ForexData).changesPercentage) : (item as ForexData).changesPercentage);

              const ItemIcon = isCrypto ? Coins : Landmark;
              const changeColor = typeof priceChange === 'number' && priceChange > 0 ? 'text-green-500' : typeof priceChange === 'number' && priceChange < 0 ? 'text-red-500' : 'text-muted-foreground';

              const formattedPrice = currentPrice !== undefined
                ? `$${currentPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: isCrypto ? 8 : 4,
                  })}`
                : 'N/A';

              return (
                <div key={name} className="p-2 bg-card rounded-lg shadow-md hover:shadow-lg transition-shadow flex flex-col justify-between min-h-[90px] border border-border/50">
                  <div>
                    <div className="flex items-center text-xs font-medium text-muted-foreground mb-0.5 truncate">
                      <ItemIcon className="h-3.5 w-3.5 mr-1.5 text-primary/80 shrink-0" />
                      <span className="truncate" title={name}>{name}</span>
                    </div>
                    <div className="text-base font-semibold text-foreground truncate" title={formattedPrice}>
                      {formattedPrice}
                    </div>
                  </div>
                  <div className={`text-sm font-medium ${changeColor} mt-1 self-start`}>
                    {typeof priceChange === 'number' ? `${priceChange.toFixed(2)}%` : 'N/A'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConsolidatedDataFeedCard;
