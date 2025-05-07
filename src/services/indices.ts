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

const FMP_API_KEY = process.env.NEXT_PUBLIC_FINANCIAL_MODELING_PREP_API_KEY;
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
const CACHE_DURATION = FMP_API_KEY ? 60 * 1000 : 5 * 60 * 1000; // 1 min for real API, 5 min for mock

export async function getIndexData(symbol: string, period: '24h' | 'ytd' = '24h'): Promise<IndexData | null> {
  const cacheKey = `${symbol}-${period}`;
  const cachedEntry = responseCache.get(cacheKey);

  if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_DURATION)) {
    return cachedEntry.data;
  }

  if (!FMP_API_KEY) {
    console.warn("FINANCIAL_MODELING_PREP_API_KEY not found. Using mock index data for:", symbol);
    const mockData = MOCK_INDEX_DATA.find(f => f.symbol.toUpperCase() === symbol.toUpperCase());
    if (mockData) {
      const dataToReturn = {
        ...mockData,
        changesPercentage: period === 'ytd' ? (mockData.ytdChangePercentage ?? mockData.changesPercentage) : mockData.changesPercentage,
      };
      responseCache.set(cacheKey, { data: dataToReturn, timestamp: Date.now() });
      return dataToReturn;
    }
    return null;
  }

  const quoteUrl = `${API_BASE_URL}/quote/${symbol.toUpperCase()}?apikey=${FMP_API_KEY}`;

  if (period === 'ytd') {
    const today = new Date();
    const yearStart = `${today.getFullYear()}-01-01`;
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const historicalUrl = `${API_BASE_URL}/historical-price-full/${symbol.toUpperCase()}?from=${yearStart}&to=${todayStr}&apikey=${FMP_API_KEY}`;

    try {
      const [quoteResponse, historicalResponse] = await Promise.all([
        fetch(quoteUrl),
        fetch(historicalUrl)
      ]);

      if (!quoteResponse.ok) {
        const errorData = await quoteResponse.json().catch(() => ({}));
        console.error(`FMP API error for ${symbol} (quote): ${quoteResponse.status} ${quoteResponse.statusText}`, errorData);
        const mockOnError = MOCK_INDEX_DATA.find(f => f.symbol.toUpperCase() === symbol.toUpperCase());
        if (mockOnError) {
          console.warn(`Falling back to mock YTD data for ${symbol} due to API quote error.`);
          responseCache.set(cacheKey, { data: {...mockOnError, changesPercentage: mockOnError.ytdChangePercentage ?? mockOnError.changesPercentage }, timestamp: Date.now() });
          return {...mockOnError, changesPercentage: mockOnError.ytdChangePercentage ?? mockOnError.changesPercentage };
        }
        return null;
      }
      const quoteDataArr: IndexData[] = await quoteResponse.json();
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
      
      const indexResult: IndexData = { ...currentQuote, changesPercentage: ytdChangePercentage, ytdChangePercentage };
      responseCache.set(cacheKey, { data: indexResult, timestamp: Date.now() });
      return indexResult;

    } catch (error) {
      console.error(`Network or parsing error fetching YTD index data for ${symbol}:`, error);
      const mockOnError = MOCK_INDEX_DATA.find(f => f.symbol.toUpperCase() === symbol.toUpperCase());
      if (mockOnError) {
        console.warn(`Falling back to mock YTD data for ${symbol} due to network/parsing error.`);
        responseCache.set(cacheKey, { data: {...mockOnError, changesPercentage: mockOnError.ytdChangePercentage ?? mockOnError.changesPercentage }, timestamp: Date.now() });
        return {...mockOnError, changesPercentage: mockOnError.ytdChangePercentage ?? mockOnError.changesPercentage };
      }
      return null;
    }
  } else { // period is '24h'
    try {
      const response = await fetch(quoteUrl);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`FMP API error for ${symbol} (24h): ${response.status} ${response.statusText}`, errorData);
        const mockOnError = MOCK_INDEX_DATA.find(f => f.symbol.toUpperCase() === symbol.toUpperCase());
        if (mockOnError) {
           console.warn(`Falling back to mock 24h data for ${symbol} due to API error.`);
           const dataToReturn = {...mockOnError, changesPercentage: mockOnError.changesPercentage};
           responseCache.set(cacheKey, { data: dataToReturn, timestamp: Date.now() });
           return dataToReturn;
        }
        return null;
      }
      const data: IndexData[] = await response.json();
      if (data && data.length > 0) {
        const resultData = {...data[0], ytdChangePercentage: data[0].changesPercentage} // temp ytd for non-ytd calls
        responseCache.set(cacheKey, { data: resultData, timestamp: Date.now() });
        return resultData;
      }
      return null;
    } catch (error) {
      console.error(`Network or parsing error fetching 24h index data for ${symbol}:`, error);
      const mockOnError = MOCK_INDEX_DATA.find(f => f.symbol.toUpperCase() === symbol.toUpperCase());
      if (mockOnError) {
           console.warn(`Falling back to mock 24h data for ${symbol} due to network/parsing error.`);
           const dataToReturn = {...mockOnError, changesPercentage: mockOnError.changesPercentage};
           responseCache.set(cacheKey, { data: dataToReturn, timestamp: Date.now() });
           return dataToReturn;
      }
      return null;
    }
  }
}
