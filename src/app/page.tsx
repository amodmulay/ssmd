
import MarketDataFeedCard from '@/components/market-data-feed-card';
import ConsolidatedDataFeedCard from '@/components/consolidated-data-feed-card';

export default function Home() {
  const cryptoSymbols = ['BTC', 'ETH'];
  const usMarketSymbols = ['S&P 500', 'NASDAQ'];
  const euMarketSymbols = ['FTSE 100', 'DAX', 'CAC 40']; // Example EU markets
  const asiaMarketSymbols = ['Nikkei 225', 'Hang Seng', 'Shanghai Composite', 'Nifty 50']; // Example Asia markets

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-primary tracking-tight">ssmd: Super simple market dashboard</h1>
        <p className="text-lg text-muted-foreground">Your simplified market data dashboard.</p>
      </header>

      <main className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          <MarketDataFeedCard
            title="Crypto Markets"
            iconName="Coins"
            marketType="crypto"
            symbols={cryptoSymbols}
            className="shadow-lg rounded-lg"
          />
          <MarketDataFeedCard
            title="US Markets"
            iconName="Landmark"
            marketType="us"
            symbols={usMarketSymbols}
            className="shadow-lg rounded-lg"
          />
          <MarketDataFeedCard
            title="EU Markets"
            iconName="Globe"
            marketType="eu"
            symbols={euMarketSymbols}
            className="shadow-lg rounded-lg"
          />
          <MarketDataFeedCard
            title="Asia Markets"
            iconName="Building2"
            marketType="asia"
            symbols={asiaMarketSymbols}
            className="shadow-lg rounded-lg"
          />
        </div>
        
        <ConsolidatedDataFeedCard />
      </main>

      <footer className="mt-12 pt-8 border-t border-border text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} ssmd. Data is for informational purposes only.</p>
      </footer>
    </div>
  );
}

