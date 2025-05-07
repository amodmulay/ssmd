
"use client";

import { Info, CalendarDays, ToggleLeft, ToggleRight } from 'lucide-react';
import MarketDataFeedCard from '@/components/market-data-feed-card';
import ConsolidatedDataFeedCard from '@/components/consolidated-data-feed-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';


export default function Home() {
  const [showYTDGlobal, setShowYTDGlobal] = useState(false);

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">
            SSMD: Super Simple Market Dashboard
          </h1>
          <p className="text-muted-foreground">Track Crypto and Stock Market Indices at a glance.</p>
        </div>
        <Button
            variant="outline"
            size="sm"
            onClick={() => setShowYTDGlobal(!showYTDGlobal)}
            aria-pressed={showYTDGlobal}
            className="flex items-center gap-2 mt-4 sm:mt-0"
        >
            <CalendarDays className="h-4 w-4" />
            {showYTDGlobal ? 'Show Daily Data' : 'Show YTD Data'}
            {showYTDGlobal ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
        </Button>
      </header>

      {/* Consolidated View / Overview */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-primary mb-4">Overview</h2>
        <ConsolidatedDataFeedCard
          title="Market Overview"
          cryptoSymbols={['bitcoin', 'ethereum', 'solana']}
          indexSymbols={['^GSPC', '^IXIC']} // S&P 500 and Nasdaq
          showYTD={showYTDGlobal}
        />
      </section>

      {/* Ad Space */}
      <section className="my-8 p-4 bg-card rounded-lg shadow-md">
        <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-border rounded-md">
          <Image
            data-ai-hint="advertisement banner"
            src="https://picsum.photos/600/100?random=ad1"
            alt="Advertisement"
            width={600}
            height={100}
            className="rounded-md object-contain"
          />
          <p className="mt-2 text-sm text-muted-foreground">Your Ad Here - Placeholder</p>
        </div>
      </section>

      {/* Individual Markets */}
      <section>
        <h2 className="text-2xl font-semibold text-primary mb-6">Individual Markets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MarketDataFeedCard
            title="Crypto Markets"
            iconName="Coins"
            marketType="crypto"
            symbols={['bitcoin', 'ethereum', 'solana']}
            showYTD={showYTDGlobal}
          />
          <MarketDataFeedCard
            title="US Major Indices"
            iconName="AreaChart" 
            marketType="index"
            symbols={['^GSPC', '^IXIC']} // S&P 500, Nasdaq
            showYTD={showYTDGlobal}
          />
          <MarketDataFeedCard
            title="European Indices"
            iconName="Euro" 
            marketType="index"
            symbols={['^GDAXI', '^FTSE']} // DAX (Germany), FTSE 100 (UK)
            showYTD={showYTDGlobal}
          />
          <MarketDataFeedCard
            title="Asian Indices"
            iconName="Sunrise" // Or Globe
            marketType="index"
            symbols={['^N225', '^HSI']} // Nikkei 225 (Japan), Hang Seng (Hong Kong)
            showYTD={showYTDGlobal}
          />
          <MarketDataFeedCard
            title="Indian Indices"
            iconName="TrendingUp" 
            marketType="index"
            symbols={['^NSEI']} // Nifty 50 (India)
            showYTD={showYTDGlobal}
          />
        </div>
      </section>

      <Alert variant="default" className="mt-12 bg-card shadow-md">
        <Info className="h-5 w-5 text-accent" />
        <AlertTitle className="font-semibold">Disclaimer</AlertTitle>
        <AlertDescription>
          Market data is provided for informational purposes only and may be delayed.
          This is not financial advice. All data is subject to provider terms.
          Crypto data powered by CoinGecko. Index data powered by FinancialModelingPrep.
        </AlertDescription>
      </Alert>
    </main>
  );
}

