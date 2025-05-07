
"use client";
import type { FC } from 'react';
import { useEffect, useState, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Minus, AlertCircle, DollarSign, Coins, AreaChart, Camera } from 'lucide-react';
import { getCryptoData, type CryptoData } from '@/services/crypto';
import { getIndexData, type IndexData } from '@/services/indices';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ConsolidatedDataFeedCardProps {
  title: string;
  cryptoSymbols: string[];
  indexSymbols: string[];
  showYTD: boolean;
}

type CombinedData = CryptoData | IndexData;

const ConsolidatedDataFeedCard: FC<ConsolidatedDataFeedCardProps> = ({ title, cryptoSymbols, indexSymbols, showYTD }) => {
  const [data, setData] = useState<CombinedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const cryptoSymbolsKey = useMemo(() => cryptoSymbols.join(','), [cryptoSymbols]);
  const indexSymbolsKey = useMemo(() => indexSymbols.join(','), [indexSymbols]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const currentPeriod = showYTD ? 'ytd' : '24h';

        // Services will use mock data if API key is missing, or live data if present.
        const cryptoPromises = cryptoSymbols.map(symbol => getCryptoData(symbol, currentPeriod));
        const indexPromises = indexSymbols.map(symbol => getIndexData(symbol, currentPeriod));

        const [cryptoResults, indexResults] = await Promise.all([ Promise.all(cryptoPromises),
          Promise.all(indexPromises)
        ]);

        const fetchedData = [
          ...cryptoResults.filter(d => d !== null) as CryptoData[],
          ...indexResults.filter(d => d !== null) as IndexData[]
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
    const intervalId = setInterval(fetchData, 60000);
    return () => clearInterval(intervalId);
  }, [cryptoSymbolsKey, indexSymbolsKey, showYTD]);


  const overallSentiment = useMemo(() => {
    if (data.length === 0) return 'neutral';
    const changes = data.map(item => {
        if ('current_price' in item) {
            return showYTD ? (item.price_change_percentage_ytd_in_currency ?? item.price_change_percentage_24h) : item.price_change_percentage_24h;
        } else {
            return showYTD ? (item.ytdChangePercentage ?? item.changesPercentage) : item.changesPercentage;
        }
    }).filter(change => typeof change === 'number') as number[];

    if (changes.length === 0) return 'neutral';
    const averageChange = changes.reduce((acc, curr) => acc + curr, 0) / changes.length;
    if (averageChange > 0.1) return 'positive';
    if (averageChange < -0.1) return 'negative';
    return 'neutral';
  }, [data, showYTD]);

  const SentimentIcon = overallSentiment === 'positive' ? TrendingUp : overallSentiment === 'negative' ? TrendingDown : Minus;
  const sentimentColor = overallSentiment === 'positive' ? 'text-green-500' : overallSentiment === 'negative' ? 'text-red-500' : 'text-muted-foreground';

  const handleScreenshot = async () => {
    if (cardRef.current) {
      try {
        const canvas = await html2canvas(cardRef.current, {
          useCORS: true,
          backgroundColor: null, // Capture actual background
          logging: false,
          scale: 2, // Increase scale for better resolution
        });
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = 'market-overview-screenshot.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({
          title: 'Screenshot Captured!',
          description: 'The market overview has been downloaded.',
        });
      } catch (err) {
        console.error('Error capturing screenshot:', err);
        toast({
          variant: 'destructive',
          title: 'Screenshot Failed',
          description: 'Could not capture the market overview. Please try again.',
        });
      }
    }
  };

  return (
    <Card ref={cardRef} className="shadow-xl hover:shadow-2xl transition-shadow duration-300 bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold text-primary flex items-center">
          <DollarSign className="h-7 w-7 mr-3 text-accent" />
          {title}
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Badge variant={showYTD ? "secondary" : "outline"} className="text-sm">{showYTD ? 'YTD' : '24h'}</Badge>
          <SentimentIcon className={`h-7 w-7 ${sentimentColor}`} />
          <Button variant="outline" size="sm" onClick={handleScreenshot} className="p-1.5" title="Capture Screenshot">
            <Camera className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {[...Array(cryptoSymbols.length + indexSymbols.length)].map((_, i) => (
              <div key={i} className="p-2 bg-card rounded-lg shadow-md border border-border/50 min-h-[90px] flex flex-col justify-between">
                <div>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-5 w-24 mb-1" />
                </div>
                <Skeleton className="h-4 w-16 self-start mt-1" />
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
              const name = item.name || ('symbol' in item ? item.symbol : 'Unknown');
              const isCrypto = 'current_price' in item;
              const currentPrice = isCrypto ? (item as CryptoData).current_price : (item as IndexData).price;

              const priceChange = isCrypto
                                    ? (showYTD ? ((item as CryptoData).price_change_percentage_ytd_in_currency ?? (item as CryptoData).price_change_percentage_24h) : (item as CryptoData).price_change_percentage_24h)
                                    : (showYTD ? ((item as IndexData).ytdChangePercentage ?? (item as IndexData).changesPercentage) : (item as IndexData).changesPercentage);

              const ItemIcon = isCrypto ? Coins : AreaChart;
              const changeColor = typeof priceChange === 'number' && priceChange > 0 ? 'text-green-500' : typeof priceChange === 'number' && priceChange < 0 ? 'text-red-500' : 'text-muted-foreground';

              const formattedPrice = currentPrice !== undefined
                ? `$${currentPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: isCrypto ? 8 : 2,
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
                    {(typeof priceChange === 'number' && priceChange !== null) ? `${priceChange.toFixed(2)}%` : 'N/A'}
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
