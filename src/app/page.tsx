
"use client";

import {
  Info,
  CalendarDays,
  ToggleLeft,
  ToggleRight,
  Replace, // Changed from Swap to Replace
} from "lucide-react";
import MarketDataFeedCard from '@/components/market-data-feed-card';
import ConsolidatedDataFeedCard from '@/components/consolidated-data-feed-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useDataSource } from "@/lib/utils";

type DataSource = "api" | "yahoo";

export default function Home() {
  const [showYTDGlobal, setShowYTDGlobal] = useState(false);
  const { getPreferredDataSource, toggleDataSource: toggleDsUtil } = useDataSource();
  const [activeDataSource, setActiveDataSource] = useState<DataSource>(
    getPreferredDataSource()
  );

  const handleToggleDataSource = () => {
    const newDataSource = toggleDsUtil();
    setActiveDataSource(newDataSource);
  };

  return (
    <main className="flex min-h-screen flex-col p-4 md:p-8 bg-background text-foreground">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center w-full">
        <div className="flex flex-row gap-4 items-center">
          <h1 className="text-3xl font-bold text-primary">
            MarketWatch Lite
          </h1>
            <Button onClick={handleToggleDataSource} variant="outline" size="sm" className="bg-card hover:bg-accent hover:text-accent-foreground">
              <Replace className="mr-2 h-4 w-4" /> {/* Changed from Swap to Replace */}
              {activeDataSource === "api"
                ? "Use Yahoo Finance Data (Mock)"
                : "Use API Data (Live/Mock)"}
            </Button>
        </div>
        <Button
            variant="outline"
            size="sm"
            onClick={() => setShowYTDGlobal(!showYTDGlobal)}
            aria-pressed={showYTDGlobal}
            className="flex items-center gap-2 mt-4 sm:mt-0 bg-card hover:bg-accent hover:text-accent-foreground"
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
          cryptoSymbols={['bitcoin', 'ethereum']}
          indexSymbols={['^GSPC', '^IXIC', '^GDAXI', '^N225', '^HSI', '^NSEI']} // S&P 500, Nasdaq, DAX, Nikkei, Hang Seng, Nifty
          showYTD={showYTDGlobal}
          dataSource={activeDataSource}
        />
      </section>

      {/* Ad Space */}
      <section className="my-8 p-4 bg-card rounded-lg shadow-lg">
        <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-border rounded-md">
          <Image
            data-ai-hint="advertisement banner"
            src="https://picsum.photos/700/100?random=adBanner"
            alt="Advertisement Placeholder"
            width={700}
            height={100}
            className="rounded-md object-contain"
            priority
          />
          <p className="mt-2 text-sm text-muted-foreground">Your Advertisement Here - Placeholder</p>
        </div>
      </section>

      {/* Individual Markets */}
      <section>
        <h2 className="text-2xl font-semibold text-primary mb-6">Individual Markets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MarketDataFeedCard
              title="Crypto Markets"
              iconName="Coins"
              marketType="crypto"
              symbols={["bitcoin", "ethereum", "solana"]}
              showYTD={showYTDGlobal}
              dataSource={activeDataSource}
          />
          <MarketDataFeedCard
              title="US Major Indices"
              iconName="AreaChart"
              marketType="index"
              symbols={["^GSPC", "^IXIC"]} // S&P 500, Nasdaq
              showYTD={showYTDGlobal}
              dataSource={activeDataSource}
          />
          <MarketDataFeedCard
              title="European Indices"
              iconName="Euro"
              marketType="index"
              symbols={["^GDAXI", "^FTSE"]} // DAX (Germany), FTSE 100 (UK)
              showYTD={showYTDGlobal}
              dataSource={activeDataSource}
          />
          <MarketDataFeedCard
              title="Asian Indices"
              iconName="Sunrise" 
              marketType="index"
              symbols={["^N225", "^HSI"]} // Nikkei 225 (Japan), Hang Seng (Hong Kong)
              showYTD={showYTDGlobal}
              dataSource={activeDataSource}
          />
          <MarketDataFeedCard
              title="Indian Indices"
              iconName="TrendingUp"
              marketType="index"
              symbols={["^NSEI"]} // Nifty 50 (India)
              showYTD={showYTDGlobal}
              dataSource={activeDataSource}
          />
           <div className="p-4 bg-card rounded-lg shadow-md flex items-center justify-center text-center col-span-1 md:col-span-2 lg:col-span-1">
            <p className="text-sm text-muted-foreground">
              Currently displaying data from{" "}
              <span className="font-semibold text-accent">
                {activeDataSource === "api" ? "Live APIs (CoinGecko/FMP)" : "Yahoo Finance (Mock Data)"}
              </span>.
              <br />
              {activeDataSource === "api" ? "Data may be delayed up to 15 mins." : "Mock data is for demonstration."}
            </p>
          </div>
        </div>
      </section>

      <Alert variant="default" className="mt-12 bg-card shadow-lg border-border/50">
        <Info className="h-5 w-5 text-accent" />
        <AlertTitle className="font-semibold text-primary">Disclaimer</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Market data is provided for informational purposes only and may be delayed.
          This is not financial advice. All data is subject to provider terms.
          Crypto data primarily from CoinGecko. Index data primarily from FinancialModelingPrep.
          Mock data used when APIs are unavailable or for Yahoo Finance option.
        </AlertDescription>
      </Alert>
    </main>
  );
}
