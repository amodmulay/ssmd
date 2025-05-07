// src/services/forex.ts
export interface ForexData {
  symbol: string;
  name?: string; // FMP might not always provide a "name" for forex pairs in simple quote
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number | null;
  priceAvg50: number;
  priceAvg200: number;
  volume: number;
  avgVolume: number;
  timestamp: number;
  // For YTD, we might need to calculate it or hope FMP provides it if we switch endpoints
  ytdChangePercentage?: number; 
}

const FMP_API_KEY = process.env.NEXT_PUBLIC_FINANCIAL_MODELING_PREP_API_KEY;
const API_BASE_URL = 'https://financialmodelingprep.com/api/v3';

const MOCK_FOREX_DATA: ForexData[] = [
  { symbol: 'EURUSD', name: 'EUR/USD', price: 1.0850, changesPercentage: 0.15, change: 0.0016, dayLow: 1.0830, dayHigh: 1.0870, yearHigh: 1.1200, yearLow: 1.0500, marketCap: null, priceAvg50: 1.0800, priceAvg200: 1.0750, volume: 100000, avgVolume: 120000, timestamp: Date.now(), ytdChangePercentage: 1.2 },
  { symbol: 'USDJPY', name: 'USD/JPY', price: 157.20, changesPercentage: -0.25, change: -0.39, dayLow: 157.00, dayHigh: 157.80, yearHigh: 160.00, yearLow: 140.00, marketCap: null, priceAvg50: 156.50, priceAvg200: 155.00, volume: 90000, avgVolume: 110000, timestamp: Date.now(), ytdChangePercentage: 8.5 },
  { symbol: 'GBPUSD', name: 'GBP/USD', price: 1.2730, changesPercentage: 0.05, change: 0.0006, dayLow: 1.2700, dayHigh: 1.2750, yearHigh: 1.3000, yearLow: 1.2000, marketCap: null, priceAvg50: 1.2700, priceAvg200: 1.2650, volume: 80000, avgVolume: 100000, timestamp: Date.now(), ytdChangePercentage: 0.5 },
  { symbol: 'AUDUSD', name: 'AUD/USD', price: 0.6650, changesPercentage: 0.30, change: 0.0020, dayLow: 0.6620, dayHigh: 0.6670, yearHigh: 0.6900, yearLow: 0.6300, marketCap: null, priceAvg50: 0.6600, priceAvg200: 0.6550, volume: 70000, avgVolume: 90000, timestamp: Date.now(), ytdChangePercentage: -1.0 },
  { symbol: 'USDCAD', name: 'USD/CAD', price: 1.3720, changesPercentage: -0.10, change: -0.0014, dayLow: 1.3700, dayHigh: 1.3750, yearHigh: 1.3900, yearLow: 1.3100, marketCap: null, priceAvg50: 1.3700, priceAvg200: 1.3600, volume: 60000, avgVolume: 80000, timestamp: Date.now(), ytdChangePercentage: 2.3 },
];

// In-memory cache for API responses
const responseCache = new Map<string, { data: ForexData, timestamp: number }>();
const CACHE_DURATION = FMP_API_KEY ? 60 * 1000 : 5 * 60 * 1000; // 1 min for real API, 5 min for mock


export async function getForexData(symbol: string, period: '24h' | 'ytd' = '24h'): Promise<ForexData | null> {
  const cacheKey = `${symbol}-${period}`;
  const cachedEntry = responseCache.get(cacheKey);

  if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_DURATION)) {
    return cachedEntry.data;
  }

  if (!FMP_API_KEY) {
    console.warn("FINANCIAL_MODELING_PREP_API_KEY not found. Using mock forex data.");
    const mockData = MOCK_FOREX_DATA.find(f => f.symbol.toUpperCase() === symbol.toUpperCase());
     if (mockData) {
      const dataToReturn = {
        ...mockData,
        // Use ytdChangePercentage if period is 'ytd', otherwise use 24h changesPercentage
        changesPercentage: period === 'ytd' ? (mockData.ytdChangePercentage ?? mockData.changesPercentage) : mockData.changesPercentage,
      };
      responseCache.set(cacheKey, { data: dataToReturn, timestamp: Date.now() });
      return dataToReturn;
    }
    return null;
  }
  
  // FMP's /quote endpoint gives 24h data. For YTD, we'd typically need historical data + calculation or a different endpoint.
  // For simplicity, if 'ytd' is requested with a real API key, we'll log a warning and return 24h data,
  // or one could implement fetching historical data and calculating YTD change.
  let url = `${API_BASE_URL}/quote/${symbol.toUpperCase()}?apikey=${FMP_API_KEY}`;

  if (period === 'ytd') {
    // To get an accurate YTD, we would ideally fetch historical data from the start of the year.
    // FMP's daily chart endpoint: /historical-chart/1day/${symbol.toUpperCase()}
    // Or, if FMP has a specific YTD field in a different endpoint, use that.
    // For now, we'll try to get daily data for the symbol for the year.
    const today = new Date();
    const yearStart = `${today.getFullYear()}-01-01`;
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const historicalUrl = `${API_BASE_URL}/historical-price-full/${symbol.toUpperCase()}?from=${yearStart}&to=${todayStr}&apikey=${FMP_API_KEY}`;
    
    try {
      const [quoteResponse, historicalResponse] = await Promise.all([
        fetch(url),
        fetch(historicalUrl)
      ]);

      if (!quoteResponse.ok) {
        const errorData = await quoteResponse.json().catch(() => ({}));
        console.error(`FMP API error for ${symbol} (quote): ${quoteResponse.status} ${quoteResponse.statusText}`, errorData);
        // Fallback to mock for current price if quote fails
        const mockOnError = MOCK_FOREX_DATA.find(f => f.symbol.toUpperCase() === symbol.toUpperCase());
        if(mockOnError) return mockOnError; // Return mock with its YTD.
        return null;
      }
      const quoteDataArr: ForexData[] = await quoteResponse.json();
      if (!quoteDataArr || quoteDataArr.length === 0) return null;
      const currentQuote = quoteDataArr[0];

      let ytdChangePercentage = currentQuote.changesPercentage; // Default to 24h if YTD calculation fails

      if (historicalResponse.ok) {
        const historicalData = await historicalResponse.json();
        if (historicalData.historical && historicalData.historical.length > 0) {
          const startOfYearPrice = historicalData.historical[historicalData.historical.length - 1].close; // Last entry is oldest
          if (startOfYearPrice && currentQuote.price) {
            ytdChangePercentage = ((currentQuote.price - startOfYearPrice) / startOfYearPrice) * 100;
          }
        } else {
          console.warn(`No historical data for YTD calculation for ${symbol}. Using 24h change.`);
        }
      } else {
         console.warn(`Failed to fetch historical data for YTD calculation for ${symbol}: ${historicalResponse.status}. Using 24h change.`);
      }
      
      const forexResult = { ...currentQuote, changesPercentage: ytdChangePercentage, ytdChangePercentage: ytdChangePercentage };
      responseCache.set(cacheKey, { data: forexResult, timestamp: Date.now() });
      return forexResult;

    } catch (error) {
      console.error(`Network or parsing error fetching YTD forex data for ${symbol}:`, error);
      const mockOnError = MOCK_FOREX_DATA.find(f => f.symbol.toUpperCase() === symbol.toUpperCase());
      if(mockOnError) return mockOnError; // Return mock with its YTD
      return null;
    }
  } else { // period is '24h'
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`FMP API error for ${symbol}: ${response.status} ${response.statusText}`, errorData);
        const mockOnError = MOCK_FOREX_DATA.find(f => f.symbol.toUpperCase() === symbol.toUpperCase());
        if(mockOnError) {
             const dataToReturn = {...mockOnError, changesPercentage: mockOnError.changesPercentage}; // Ensure 24h mock is used
             responseCache.set(cacheKey, { data: dataToReturn, timestamp: Date.now() });
             return dataToReturn;
        }
        return null;
      }
      const data: ForexData[] = await response.json();
      if (data && data.length > 0) {
        responseCache.set(cacheKey, { data: data[0], timestamp: Date.now() });
        return data[0];
      }
      return null;
    } catch (error) {
      console.error(`Network or parsing error fetching forex data for ${symbol}:`, error);
      const mockOnError = MOCK_FOREX_DATA.find(f => f.symbol.toUpperCase() === symbol.toUpperCase());
      if(mockOnError) {
           const dataToReturn = {...mockOnError, changesPercentage: mockOnError.changesPercentage}; // Ensure 24h mock is used
           responseCache.set(cacheKey, { data: dataToReturn, timestamp: Date.now() });
           return dataToReturn;
      }
      return null;
    }
  }
}
