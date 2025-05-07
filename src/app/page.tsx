"use client";

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';import { useState } from 'react';
import MarketDataFeedCard from '@/components/market-data-feed-card';
import ConsolidatedDataFeedCard from '@/components/consolidated-data-feed-card';
import { Info } from 'lucide-react';
import OnlineAdsCard from '@/components/online-ads-card';

export default function Home() {
  const cryptoSymbols = ['BTC', 'ETH'];
  const usMarketSymbols = ['S&P 500', 'NASDAQ'];
  const euMarketSymbols = ['FTSE 100', 'DAX', 'CAC 40']; // Example EU markets
  const asiaMarketSymbols = ['Nikkei 225', 'Hang Seng', 'Shanghai Composite', 'Nifty 50']; // Example Asia markets
    const [hasError, setHasError] = useState(false);

  const handleError = () => {
    setHasError(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 relative">
      {hasError && (
        <Alert variant="destructive" className="mb-4 shadow-md">
          <Info className="h-4 w-4 mr-2" />
          <AlertTitle>Data Source Notice</AlertTitle>
          <AlertDescription>
            If market data is not loading, it may be blocked by network rules.
            Please check your network settings.
          </AlertDescription>
        </Alert>
      )}
      



      <header className="mb-8">
        <h1 className="text-4xl font-bold text-primary tracking-tight">SSMD</h1>
        <p className="text-lg text-muted-foreground">Super simple market dashboard</p>
      </header>

      <main className="space-y-8">
        <ConsolidatedDataFeedCard />
        
        <OnlineAdsCard />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          <MarketDataFeedCard
            title="Crypto Markets"
            iconName="Coins"
            marketType="crypto"
            symbols={cryptoSymbols}
            onError={handleError}
            className="shadow-lg rounded-lg"
          />
          <MarketDataFeedCard
            title="US Markets"
            iconName="Landmark"
            marketType="us"
            onError={handleError}
            symbols={usMarketSymbols}
            className="shadow-lg rounded-lg"
          />
          <MarketDataFeedCard
            title="EU Markets"
            iconName="Globe"
            onError={handleError}
            marketType="eu"
            symbols={euMarketSymbols}
            className="shadow-lg rounded-lg"
          />
          <MarketDataFeedCard
            title="Asia Markets"
            onError={handleError}
            iconName="Building2"
            marketType="asia"
            symbols={asiaMarketSymbols}
            className="shadow-lg rounded-lg"
          />
        </div>
    </main>

      <footer className="mt-12 pt-8 border-t border-border text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} ssmd. Data is for informational purposes only.</p>
      </footer>
    </div>
  );
}
