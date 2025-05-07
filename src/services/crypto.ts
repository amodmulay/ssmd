// src/services/crypto.ts
export interface CryptoData {
  id: string; // Original passed symbol, e.g., "bitcoin"
  symbol: string; // Base asset symbol, e.g., "btc"
  name: string; // Display name, e.g., "Bitcoin"
  current_price: number;
  price_change_percentage_24h: number;
  price_change_percentage_ytd_in_currency?: number; // Fallback to 24h if YTD not available
  total_volume?: number; // Volume in quote currency (e.g., USDT)
  last_updated: string;
}

const API_BASE_URL = 'https://api.binance.com/api/v3';
// Binance public endpoints for ticker data generally do not require an API key but are rate-limited.

const symbolMap: { [key: string]: { binanceSymbol: string, displayName: string, baseAsset: string } } = {
  'bitcoin': { binanceSymbol: 'BTCUSDT', displayName: 'Bitcoin', baseAsset: 'btc' },
  'ethereum': { binanceSymbol: 'ETHUSDT', displayName: 'Ethereum', baseAsset: 'eth' },
  'solana': { binanceSymbol: 'SOLUSDT', displayName: 'Solana', baseAsset: 'sol' },
  // Add other mappings as needed
};

const MOCK_CRYPTO_DATA_TEMPLATE: Omit<CryptoData, 'id' | 'symbol' | 'name' | 'last_updated' | 'current_price' | 'price_change_percentage_24h' | 'price_change_percentage_ytd_in_currency' | 'total_volume'> = {
  // Common structure, specific values will be overridden
};

const generateMockCryptoData = (mappedInfo: { binanceSymbol: string, displayName: string, baseAsset: string }, passedSymbol: string): CryptoData => {
  const basePrice = mappedInfo.binanceSymbol === 'BTCUSDT' ? 60000 : mappedInfo.binanceSymbol === 'ETHUSDT' ? 3000 : 150;
  const priceFluctuation = (Math.random() * (basePrice * 0.02)) - (basePrice * 0.01); // +/- 1%
  const changeFluctuation = Math.random() * 1 - 0.5; // +/- 0.5%

  return {
    ...MOCK_CRYPTO_DATA_TEMPLATE,
    id: passedSymbol,
    symbol: mappedInfo.baseAsset,
    name: mappedInfo.displayName,
    current_price: parseFloat((basePrice + priceFluctuation).toFixed(2)),
    price_change_percentage_24h: parseFloat((mappedInfo.binanceSymbol === 'BTCUSDT' ? 1.5 : mappedInfo.binanceSymbol === 'ETHUSDT' ? -0.5 : 3.5 + changeFluctuation).toFixed(2)),
    price_change_percentage_ytd_in_currency: parseFloat((mappedInfo.binanceSymbol === 'BTCUSDT' ? 50.0 : mappedInfo.binanceSymbol === 'ETHUSDT' ? 30.0 : 80.0 + changeFluctuation * 10).toFixed(2)),
    total_volume: parseFloat(((mappedInfo.binanceSymbol === 'BTCUSDT' ? 50e9 : mappedInfo.binanceSymbol === 'ETHUSDT' ? 20e9 : 3e9) * (1 + Math.random() * 0.1 - 0.05)).toFixed(0)),
    last_updated: new Date().toISOString(),
  };
};


// In-memory cache for API responses
const responseCache = new Map<string, { data: CryptoData | null, timestamp: number }>();
const CACHE_DURATION_LIVE = 60 * 1000; // 1 minute for live data
const CACHE_DURATION_MOCK_OR_DEMO = 15 * 60 * 1000; // 15 minutes for mock/demo

function getMockData(passedSymbol: string, period: '24h' | 'ytd', cacheKey: string): CryptoData | null {
  console.warn(`Using mock crypto data for ${passedSymbol} (${period}) from Binance structure.`);
  const mappedInfo = symbolMap[passedSymbol.toLowerCase()];
  if (!mappedInfo) {
    console.warn(`No mapping found for symbol: ${passedSymbol}. Cannot provide mock data.`);
    responseCache.set(cacheKey, { data: null, timestamp: Date.now() });
    return null;
  }
  
  const mockData = generateMockCryptoData(mappedInfo, passedSymbol);
  if (period === 'ytd' && mockData.price_change_percentage_ytd_in_currency === undefined) {
     // If YTD is specifically requested and not available, use 24h as fallback for display consistency
     mockData.price_change_percentage_ytd_in_currency = mockData.price_change_percentage_ytd_in_currency ?? mockData.price_change_percentage_24h;
  }

  responseCache.set(cacheKey, { data: mockData, timestamp: Date.now() });
  return mockData;
}

export async function getCryptoData(passedSymbol: string, period: '24h' | 'ytd' = '24h', forceMock: boolean = false): Promise<CryptoData | null> {
  const cacheKey = `binance-${passedSymbol}-${period}-${forceMock ? 'mock' : 'live'}`;
  const cachedEntry = responseCache.get(cacheKey);
  const currentCacheDuration = forceMock ? CACHE_DURATION_MOCK_OR_DEMO : CACHE_DURATION_LIVE;

  if (cachedEntry && (Date.now() - cachedEntry.timestamp < currentCacheDuration)) {
    return cachedEntry.data;
  }

  const mappedInfo = symbolMap[passedSymbol.toLowerCase()];
  if (!mappedInfo) {
    console.warn(`No Binance mapping for symbol: ${passedSymbol}.`);
    return getMockData(passedSymbol, period, cacheKey); // Attempt mock for unknown, or return null based on getMockData logic
  }

  if (forceMock) {
    return getMockData(passedSymbol, period, cacheKey);
  }

  const url = `${API_BASE_URL}/ticker/24hr?symbol=${mappedInfo.binanceSymbol}`;
  
  try {
    console.log(`Fetching crypto data for ${mappedInfo.binanceSymbol} (mapped from ${passedSymbol}) from Binance API: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `Failed to parse error response for ${mappedInfo.binanceSymbol}` }));
      console.warn(`Binance API error for ${mappedInfo.binanceSymbol}: ${response.status} ${response.statusText}. Response: ${JSON.stringify(errorData)}. Using mock data as fallback.`);
      return getMockData(passedSymbol, period, cacheKey);
    }
    
    const data = await response.json();

    if (data && data.symbol) {
      const currentPrice = parseFloat(data.lastPrice);
      const priceChangePercent24h = parseFloat(data.priceChangePercent);
      // Binance 24hr ticker doesn't provide YTD directly. We'll use 24h for YTD if period is 'ytd'.
      const ytdChange = priceChangePercent24h; 

      const processedData: CryptoData = {
        id: passedSymbol, 
        symbol: mappedInfo.baseAsset, 
        name: mappedInfo.displayName, 
        current_price: currentPrice,
        price_change_percentage_24h: priceChangePercent24h,
        price_change_percentage_ytd_in_currency: period === 'ytd' ? ytdChange : priceChangePercent24h,
        total_volume: data.quoteVolume ? parseFloat(data.quoteVolume) : undefined,
        last_updated: new Date(data.closeTime || Date.now()).toISOString(),
      };
      responseCache.set(cacheKey, { data: processedData, timestamp: Date.now() });
      return processedData;
    }
    console.warn(`No data or unexpected format from Binance API for ${mappedInfo.binanceSymbol}. Using mock data as fallback.`);
    return getMockData(passedSymbol, period, cacheKey);
  } catch (error) {
    let message = `Network or parsing error fetching crypto data for ${mappedInfo.binanceSymbol} from Binance. Using mock data as fallback.`;
    if (error instanceof Error) {
        message += ` Details: ${error.message}`;
    } else {
        message += ` Details: ${String(error)}`;
    }
    console.warn(message); // Changed from console.error
    return getMockData(passedSymbol, period, cacheKey);
  }
}