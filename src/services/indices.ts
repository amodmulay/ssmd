
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

const FMP_API_KEY = process.env.NEXT_PUBLIC_FINANCIAL_MODELING_PREP_API_KEY || "demo";
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

const responseCache = new Map<string, { data: IndexData | null, timestamp: number }>();
const CACHE_DURATION_WITH_KEY = 60 * 1000; // 1 minute with API key
const CACHE_DURATION_DEMO = 15 * 60 * 1000; // 15 minutes for demo/mock

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
      ytdChangePercentage: ytdChange, 
      timestamp: Date.now(),
    };
    responseCache.set(cacheKey, { data: dataToReturn, timestamp: Date.now() });
    return dataToReturn;
  }
  return null;
}

export async function getIndexData(symbol: string, period: '24h' | 'ytd' = '24h', forceMock: boolean = false): Promise<IndexData | null> {
  const cacheKey = `${symbol}-${period}-${forceMock ? 'mock' : (FMP_API_KEY !== "demo" ? 'live' : 'demo')}`;
  const cachedEntry = responseCache.get(cacheKey);
  const currentCacheDuration = forceMock ? CACHE_DURATION_DEMO : (FMP_API_KEY !== "demo" ? CACHE_DURATION_WITH_KEY : CACHE_DURATION_DEMO);


  if (cachedEntry && (Date.now() - cachedEntry.timestamp < currentCacheDuration)) {
    return cachedEntry.data;
  }

  if (forceMock || FMP_API_KEY === "demo") {
     // Use mock data if forced or if API key is "demo" (indicating free tier)
    return getMockIndexData(symbol, period, cacheKey);
  }


  const quoteUrl = `${API_BASE_URL}/quote/${symbol.toUpperCase()}?apikey=${FMP_API_KEY}`;

  if (period === 'ytd') {
    const today = new Date();
    const yearStart = `${today.getFullYear()}-01-01`;
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const historicalUrl = `${API_BASE_URL}/historical-price-full/${symbol.toUpperCase()}?from=${yearStart}&to=${todayStr}&apikey=${FMP_API_KEY}`;

    try {
      console.log(`Fetching YTD index data for ${symbol} with API key.`);
      const [quoteResponse, historicalResponse] = await Promise.all([
        fetch(quoteUrl),
        fetch(historicalUrl)
      ]);

      if (!quoteResponse.ok) {
        const errorData = await quoteResponse.json().catch(() => ({}));
        console.warn(`FMP API error for ${symbol} (YTD quote with key): ${quoteResponse.status} ${quoteResponse.statusText}`, errorData, "Using mock YTD data as fallback.");
        const mockResult = getMockIndexData(symbol, period, cacheKey);
        if (mockResult === null) {
            responseCache.set(cacheKey, { data: null, timestamp: Date.now() });
        }
        return mockResult;
      }
      const quoteDataArr: IndexData[] = await quoteResponse.json();
      if (!quoteDataArr || quoteDataArr.length === 0 || typeof quoteDataArr[0].price !== 'number') {
          console.warn(`No valid YTD quote data from FMP API for ${symbol} with key. Using mock YTD data.`);
          const mockResult = getMockIndexData(symbol, period, cacheKey);
          if (mockResult === null) {
              responseCache.set(cacheKey, { data: null, timestamp: Date.now() });
          }
          return mockResult;
      }
      const currentQuote = quoteDataArr[0];

      let ytdChangePercentage = currentQuote.changesPercentage; 

      if (historicalResponse.ok) {
        const historicalData = await historicalResponse.json();
        if (historicalData.historical && historicalData.historical.length > 0) {
          const startOfYearPrice = historicalData.historical[historicalData.historical.length - 1].close;
          if (typeof startOfYearPrice === 'number' && typeof currentQuote.price === 'number' && startOfYearPrice !== 0) {
            ytdChangePercentage = ((currentQuote.price - startOfYearPrice) / startOfYearPrice) * 100;
          } else {
            console.warn(`Could not calculate YTD change for ${symbol} from historical data (missing/invalid/zero prices). Using quote's change percentage.`);
          }
        } else {
          console.warn(`No historical data for YTD calculation for ${symbol} with key. Using quote's change percentage.`);
        }
      } else {
         console.warn(`Failed to fetch historical data for YTD calculation for ${symbol} (key: ${historicalResponse.statusText}). Using quote's change percentage.`);
      }
      
      const indexResult: IndexData = { ...currentQuote, name: currentQuote.name || symbol, changesPercentage: ytdChangePercentage, ytdChangePercentage: ytdChangePercentage };
      responseCache.set(cacheKey, { data: indexResult, timestamp: Date.now() });
      return indexResult;

    } catch (error) {
      console.error(`Network or parsing error fetching YTD index data for ${symbol} with key:`, error, "Using mock YTD data as fallback.");
      const mockResult = getMockIndexData(symbol, period, cacheKey);
      if (mockResult === null) {
          responseCache.set(cacheKey, { data: null, timestamp: Date.now() });
      }
      return mockResult;
    }
  } else { // period is '24h'
    try {
      console.log(`Fetching 24h index data for ${symbol} with API key.`);
      const response = await fetch(quoteUrl);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn(`FMP API error for ${symbol} (24h with key): ${response.status} ${response.statusText}`, errorData, "Using mock 24h data as fallback.");
        const mockResult = getMockIndexData(symbol, period, cacheKey);
        if (mockResult === null) {
            responseCache.set(cacheKey, { data: null, timestamp: Date.now() });
        }
        return mockResult;
      }
      const data: IndexData[] = await response.json();
      if (data && data.length > 0 && typeof data[0].price === 'number') {
        const resultData = {...data[0], name: data[0].name || symbol, ytdChangePercentage: data[0].ytdChangePercentage ?? data[0].changesPercentage }; // ensure ytdChangePercentage defaults if null
        responseCache.set(cacheKey, { data: resultData, timestamp: Date.now() });
        return resultData;
      }
      console.warn(`No valid 24h data from FMP API for ${symbol} with key. Using mock 24h data.`);
      const mockResult = getMockIndexData(symbol, period, cacheKey);
      if (mockResult === null) {
          responseCache.set(cacheKey, { data: null, timestamp: Date.now() });
      }
      return mockResult;
    } catch (error) {
      console.error(`Network or parsing error fetching 24h index data for ${symbol} with key:`, error, "Using mock 24h data as fallback.");
      const mockResult = getMockIndexData(symbol, period, cacheKey);
      if (mockResult === null) {
          responseCache.set(cacheKey, { data: null, timestamp: Date.now() });
      }
      return mockResult;
    }
  }
}
