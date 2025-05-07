// src/services/indices.ts
export interface IndexData {
  symbol: string;
  name?: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow?: number;
  dayHigh?: number;
  yearHigh?: number;
  yearLow?: number;
  marketCap?: number | null;
  priceAvg50?: number;
  priceAvg200?: number;
  volume?: number;
  avgVolume?: number;
  timestamp?: number;
  ytdChangePercentage?: number;
}

const FMP_DEMO_API_KEY = "demo"; // Use FMP's demo key for free, limited access
const API_BASE_URL = 'https://financialmodelingprep.com/api/v3';

const MOCK_INDEX_DATA: IndexData[] = [
  { symbol: '^GSPC', name: 'S&P 500', price: 5400.50, changesPercentage: 0.55, change: 29.70, timestamp: Date.now(), ytdChangePercentage: 12.5 },
  { symbol: '^IXIC', name: 'NASDAQ Composite', price: 17500.20, changesPercentage: 0.80, change: 139.00, timestamp: Date.now(), ytdChangePercentage: 15.2 },
  { symbol: '^FTSE', name: 'FTSE 100', price: 8200.00, changesPercentage: 0.20, change: 16.40, timestamp: Date.now(), ytdChangePercentage: 5.1 },
  { symbol: '^GDAXI', name: 'DAX PERFORMANCE-INDEX', price: 18300.75, changesPercentage: -0.10, change: -18.30, timestamp: Date.now(), ytdChangePercentage: 8.3 },
  { symbol: '^N225', name: 'Nikkei 225', price: 38500.00, changesPercentage: 0.45, change: 173.25, timestamp: Date.now(), ytdChangePercentage: 10.8 },
  { symbol: '^HSI', name: 'HANG SENG INDEX', price: 18000.50, changesPercentage: -0.50, change: -90.00, timestamp: Date.now(), ytdChangePercentage: 2.5 },
  { symbol: '^NSEI', name: 'NIFTY 50', price: 23500.00, changesPercentage: 0.60, change: 141.00, timestamp: Date.now(), ytdChangePercentage: 9.0 },
];

const responseCache = new Map<string, { data: IndexData, timestamp: number }>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes cache for API and mock data

function getMockIndexData(symbol: string, period: '24h' | 'ytd', cacheKey: string): IndexData | null {
  console.warn(`Using mock index data for ${symbol} (${period}).`);
  const baseMockData = MOCK_INDEX_DATA.find(f => f.symbol.toUpperCase() === symbol.toUpperCase());
  if (baseMockData) {
    const priceFluctuation = (Math.random() * (baseMockData.price * 0.01)) - (baseMockData.price * 0.005); // +/- 0.5%
    const changeFluctuation = Math.random() * 0.5 - 0.25; // +/- 0.25%

    const ytdChange = (baseMockData.ytdChangePercentage ?? baseMockData.changesPercentage) + changeFluctuation;
    const dailyChange = baseMockData.changesPercentage + changeFluctuation;
    
    const dataToReturn: IndexData = {
      ...baseMockData,
      name: baseMockData.name || symbol,
      price: parseFloat((baseMockData.price + priceFluctuation).toFixed(2)),
      changesPercentage: period === 'ytd' ? ytdChange : dailyChange,
      ytdChangePercentage: ytdChange, // Always provide a YTD value from mock
      timestamp: Date.now(),
    };
    responseCache.set(cacheKey, { data: dataToReturn, timestamp: Date.now() });
    return dataToReturn;
  }
  return null;
}

export async function getIndexData(symbol: string, period: '24h' | 'ytd' = '24h'): Promise<IndexData | null> {
  const cacheKey = `${symbol}-${period}`;
  const cachedEntry = responseCache.get(cacheKey);

  if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_DURATION)) {
    return cachedEntry.data;
  }

  const quoteUrl = `${API_BASE_URL}/quote/${symbol.toUpperCase()}?apikey=${FMP_DEMO_API_KEY}`;

  if (period === 'ytd') {
    const today = new Date();
    const yearStart = `${today.getFullYear()}-01-01`;
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const historicalUrl = `${API_BASE_URL}/historical-price-full/${symbol.toUpperCase()}?from=${yearStart}&to=${todayStr}&apikey=${FMP_DEMO_API_KEY}`;

    try {
      console.log(`Fetching YTD index data for ${symbol} using demo key.`);
      const [quoteResponse, historicalResponse] = await Promise.all([
        fetch(quoteUrl),
        fetch(historicalUrl)
      ]);

      if (!quoteResponse.ok) {
        const errorData = await quoteResponse.json().catch(() => ({}));
        console.warn(`FMP API error for ${symbol} (YTD quote with demo key): ${quoteResponse.status} ${quoteResponse.statusText}`, errorData, "Using mock YTD data as fallback.");
        return getMockIndexData(symbol, period, cacheKey);
      }
      const quoteDataArr: IndexData[] = await quoteResponse.json();
      if (!quoteDataArr || quoteDataArr.length === 0 || typeof quoteDataArr[0].price !== 'number') {
          console.warn(`No valid YTD quote data from FMP API for ${symbol} with demo key. Using mock YTD data.`);
          return getMockIndexData(symbol, period, cacheKey);
      }
      const currentQuote = quoteDataArr[0];

      let ytdChangePercentage = currentQuote.changesPercentage; 

      if (historicalResponse.ok) {
        const historicalData = await historicalResponse.json();
        if (historicalData.historical && historicalData.historical.length > 0) {
          const startOfYearPrice = historicalData.historical[historicalData.historical.length - 1].close;
          if (typeof startOfYearPrice === 'number' && typeof currentQuote.price === 'number') {
            ytdChangePercentage = ((currentQuote.price - startOfYearPrice) / startOfYearPrice) * 100;
          } else {
            console.warn(`Could not calculate YTD change for ${symbol} from historical data (missing/invalid prices). Using 24h change or quote's change.`);
          }
        } else {
          console.warn(`No historical data for YTD calculation for ${symbol} with demo key. Using 24h change or quote's change.`);
        }
      } else {
         console.warn(`Failed to fetch historical data for YTD calculation for ${symbol} (demo key: ${historicalResponse.statusText}). Using 24h change or quote's change.`);
      }
      
      const indexResult: IndexData = { ...currentQuote, name: currentQuote.name || symbol, changesPercentage: ytdChangePercentage, ytdChangePercentage: ytdChangePercentage };
      responseCache.set(cacheKey, { data: indexResult, timestamp: Date.now() });
      return indexResult;

    } catch (error) {
      console.error(`Network or parsing error fetching YTD index data for ${symbol} with demo key:`, error, "Using mock YTD data as fallback.");
      return getMockIndexData(symbol, period, cacheKey);
    }
  } else { // period is '24h'
    try {
      console.log(`Fetching 24h index data for ${symbol} using demo key.`);
      const response = await fetch(quoteUrl);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn(`FMP API error for ${symbol} (24h with demo key): ${response.status} ${response.statusText}`, errorData, "Using mock 24h data as fallback.");
        return getMockIndexData(symbol, period, cacheKey);
      }
      const data: IndexData[] = await response.json();
      if (data && data.length > 0 && typeof data[0].price === 'number') {
        // For 24h period, ytdChangePercentage can be the same as changesPercentage if the API provides a YTD field, or calculated if we had a start of year price.
        // For simplicity with demo key, we'll pass what the quote gives. The mock will have a distinct YTD.
        const resultData = {...data[0], name: data[0].name || symbol, ytdChangePercentage: data[0].ytdChangePercentage ?? data[0].changesPercentage };
        responseCache.set(cacheKey, { data: resultData, timestamp: Date.now() });
        return resultData;
      }
      console.warn(`No valid 24h data from FMP API for ${symbol} with demo key. Using mock 24h data.`);
      return getMockIndexData(symbol, period, cacheKey);
    } catch (error) {
      console.error(`Network or parsing error fetching 24h index data for ${symbol} with demo key:`, error, "Using mock 24h data as fallback.");
      return getMockIndexData(symbol, period, cacheKey);
    }
  }
}
