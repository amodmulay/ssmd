// src/services/crypto.ts
import type { cache } from 'react';

export interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
  price_change_percentage_1y_in_currency?: number;
  price_change_percentage_ytd_in_currency?: number; // Added for YTD
  last_updated: string;
}

const COINGECKO_API_KEY = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
const API_BASE_URL = COINGECKO_API_KEY 
  ? 'https://api.coingecko.com/api/v3' 
  : 'https://pro-api.coingecko.com/api/v3'; // Pro API for more features if key is available

const MOCK_CRYPTO_DATA: CryptoData[] = [
  { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', image: 'https://picsum.photos/32/32?random=1', current_price: 60000, market_cap: 1200000000000, market_cap_rank: 1, total_volume: 50000000000, price_change_percentage_24h: 1.5, price_change_percentage_ytd_in_currency: 50.0, last_updated: new Date().toISOString() },
  { id: 'ethereum', symbol: 'eth', name: 'Ethereum', image: 'https://picsum.photos/32/32?random=2', current_price: 3000, market_cap: 360000000000, market_cap_rank: 2, total_volume: 20000000000, price_change_percentage_24h: -0.5, price_change_percentage_ytd_in_currency: 30.0, last_updated: new Date().toISOString() },
  { id: 'ripple', symbol: 'xrp', name: 'Ripple', image: 'https://picsum.photos/32/32?random=3', current_price: 0.5, market_cap: 25000000000, market_cap_rank: 6, total_volume: 1000000000, price_change_percentage_24h: 2.1, price_change_percentage_ytd_in_currency: -10.0, last_updated: new Date().toISOString() },
  { id: 'litecoin', symbol: 'ltc', name: 'Litecoin', image: 'https://picsum.photos/32/32?random=4', current_price: 150, market_cap: 10000000000, market_cap_rank: 20, total_volume: 500000000, price_change_percentage_24h: 0.8, price_change_percentage_ytd_in_currency: 20.0, last_updated: new Date().toISOString() },
  { id: 'cardano', symbol: 'ada', name: 'Cardano', image: 'https://picsum.photos/32/32?random=5', current_price: 0.4, market_cap: 15000000000, market_cap_rank: 8, total_volume: 800000000, price_change_percentage_24h: -1.2, price_change_percentage_ytd_in_currency: 5.0, last_updated: new Date().toISOString() },
  { id: 'solana', symbol: 'sol', name: 'Solana', image: 'https://picsum.photos/32/32?random=6', current_price: 150, market_cap: 70000000000, market_cap_rank: 5, total_volume: 3000000000, price_change_percentage_24h: 3.5, price_change_percentage_ytd_in_currency: 80.0, last_updated: new Date().toISOString() },
];


// In-memory cache for API responses
const responseCache = new Map<string, { data: CryptoData, timestamp: number }>();
const CACHE_DURATION = COINGECKO_API_KEY ? 60 * 1000 : 5 * 60 * 1000; // 1 min for real API, 5 min for mock


export async function getCryptoData(symbol: string, period: '24h' | 'ytd' = '24h'): Promise<CryptoData | null> {
  const cacheKey = `${symbol}-${period}`;
  const cachedEntry = responseCache.get(cacheKey);

  if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_DURATION)) {
    return cachedEntry.data;
  }

  if (!COINGECKO_API_KEY) {
    console.warn("COINGECKO_API_KEY not found. Using mock crypto data.");
    const mockData = MOCK_CRYPTO_DATA.find(c => c.id.toLowerCase() === symbol.toLowerCase() || c.symbol.toLowerCase() === symbol.toLowerCase());
    if (mockData) {
      // Simulate YTD change if period is 'ytd' for mock data
      const ytdChange = mockData.price_change_percentage_ytd_in_currency ?? (Math.random() * 100 - 50); // Random YTD if not present
      const dataToReturn = {
        ...mockData,
        price_change_percentage_24h: period === 'ytd' ? ytdChange : mockData.price_change_percentage_24h,
        price_change_percentage_ytd_in_currency: ytdChange,
      };
      responseCache.set(cacheKey, { data: dataToReturn, timestamp: Date.now() });
      return dataToReturn;
    }
    return null;
  }

  // Determine price change percentages to request based on period
  let priceChangePercentages = '24h'; // Default
  if (period === 'ytd') {
    priceChangePercentages = '24h,7d,14d,30d,60d,200d,1y,ytd'; // YTD needs 'ytd'
  }
  
  const url = `${API_BASE_URL}/coins/markets?vs_currency=usd&ids=${symbol}&order=market_cap_desc&per_page=1&page=1&sparkline=false&price_change_percentage=${priceChangePercentages}&x_cg_demo_api_key=${COINGECKO_API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `Failed to parse error response for ${symbol}` }));
      console.error(`CoinGecko API error for ${symbol}: ${response.status} ${response.statusText}`, errorData);
      // Fallback to mock data on API error if appropriate, or return null
      const mockForError = MOCK_CRYPTO_DATA.find(c => c.id.toLowerCase() === symbol.toLowerCase() || c.symbol.toLowerCase() === symbol.toLowerCase());
      if (mockForError) {
        console.warn(`Falling back to mock data for ${symbol} due to API error.`);
        const ytdChange = mockForError.price_change_percentage_ytd_in_currency ?? (Math.random() * 100 - 50);
        const dataToReturnOnError = {
            ...mockForError,
            price_change_percentage_24h: period === 'ytd' ? ytdChange : mockForError.price_change_percentage_24h,
            price_change_percentage_ytd_in_currency: ytdChange,
        };
        responseCache.set(cacheKey, { data: dataToReturnOnError, timestamp: Date.now() });
        return dataToReturnOnError;
      }
      return null;
    }
    const data: CryptoData[] = await response.json();
    if (data && data.length > 0) {
      // Ensure the correct percentage is used based on the period
      const coinData = {
        ...data[0],
        price_change_percentage_24h: period === 'ytd' 
          ? (data[0].price_change_percentage_ytd_in_currency ?? data[0].price_change_percentage_24h) 
          : data[0].price_change_percentage_24h,
      };
      responseCache.set(cacheKey, { data: coinData, timestamp: Date.now() });
      return coinData;
    }
    return null;
  } catch (error) {
    console.error(`Network or parsing error fetching crypto data for ${symbol}:`, error);
    // Fallback to mock data on network/parsing error
    const mockForError = MOCK_CRYPTO_DATA.find(c => c.id.toLowerCase() === symbol.toLowerCase() || c.symbol.toLowerCase() === symbol.toLowerCase());
    if (mockForError) {
        console.warn(`Falling back to mock data for ${symbol} due to network/parsing error.`);
        const ytdChange = mockForError.price_change_percentage_ytd_in_currency ?? (Math.random() * 100 - 50);
        const dataToReturnOnError = {
            ...mockForError,
            price_change_percentage_24h: period === 'ytd' ? ytdChange : mockForError.price_change_percentage_24h,
            price_change_percentage_ytd_in_currency: ytdChange,
        };
        responseCache.set(cacheKey, { data: dataToReturnOnError, timestamp: Date.now() });
        return dataToReturnOnError;
    }
    return null;
  }
}

