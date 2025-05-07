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
  price_change_percentage_ytd_in_currency?: number;
  last_updated: string;
}

const API_BASE_URL = 'https://api.coingecko.com/api/v3'; // Always use public API

const MOCK_CRYPTO_DATA: CryptoData[] = [
  { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1696501400', current_price: 60000, market_cap: 1200000000000, market_cap_rank: 1, total_volume: 50000000000, price_change_percentage_24h: 1.5, price_change_percentage_ytd_in_currency: 50.0, last_updated: new Date().toISOString() },
  { id: 'ethereum', symbol: 'eth', name: 'Ethereum', image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1696501628', current_price: 3000, market_cap: 360000000000, market_cap_rank: 2, total_volume: 20000000000, price_change_percentage_24h: -0.5, price_change_percentage_ytd_in_currency: 30.0, last_updated: new Date().toISOString() },
  { id: 'ripple', symbol: 'xrp', name: 'Ripple', image: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-gradient--black-background.png?1696501943', current_price: 0.5, market_cap: 25000000000, market_cap_rank: 6, total_volume: 1000000000, price_change_percentage_24h: 2.1, price_change_percentage_ytd_in_currency: -10.0, last_updated: new Date().toISOString() },
  { id: 'litecoin', symbol: 'ltc', name: 'Litecoin', image: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png?1696501409', current_price: 150, market_cap: 10000000000, market_cap_rank: 20, total_volume: 500000000, price_change_percentage_24h: 0.8, price_change_percentage_ytd_in_currency: 20.0, last_updated: new Date().toISOString() },
  { id: 'cardano', symbol: 'ada', name: 'Cardano', image: 'https://assets.coingecko.com/coins/images/975/large/cardano.png?1696502090', current_price: 0.4, market_cap: 15000000000, market_cap_rank: 8, total_volume: 800000000, price_change_percentage_24h: -1.2, price_change_percentage_ytd_in_currency: 5.0, last_updated: new Date().toISOString() },
  { id: 'solana', symbol: 'sol', name: 'Solana', image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png?1696504756', current_price: 150, market_cap: 70000000000, market_cap_rank: 5, total_volume: 3000000000, price_change_percentage_24h: 3.5, price_change_percentage_ytd_in_currency: 80.0, last_updated: new Date().toISOString() },
];

// In-memory cache for API responses
const responseCache = new Map<string, { data: CryptoData, timestamp: number }>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes cache for API and mock data

function getMockCryptoData(symbol: string, period: '24h' | 'ytd', cacheKey: string): CryptoData | null {
  console.warn(`Using mock crypto data for ${symbol} (${period}).`);
  const baseMockData = MOCK_CRYPTO_DATA.find(c => c.id.toLowerCase() === symbol.toLowerCase() || c.symbol.toLowerCase() === symbol.toLowerCase());
  if (baseMockData) {
    // Simulate some data fluctuation for mock
    const priceFluctuation = (Math.random() * (baseMockData.current_price * 0.02)) - (baseMockData.current_price * 0.01); // +/- 1%
    const changeFluctuation = Math.random() * 1 - 0.5; // +/- 0.5%

    const ytdChange = (baseMockData.price_change_percentage_ytd_in_currency ?? (Math.random() * 100 - 50)) + changeFluctuation;
    const dailyChange = baseMockData.price_change_percentage_24h + changeFluctuation;

    const dataToReturn: CryptoData = {
      ...baseMockData,
      current_price: parseFloat((baseMockData.current_price + priceFluctuation).toFixed(Math.max(2, (baseMockData.current_price < 1 ? 8 : 2)))),
      price_change_percentage_24h: period === 'ytd' ? ytdChange : dailyChange,
      price_change_percentage_ytd_in_currency: ytdChange,
      last_updated: new Date().toISOString(),
    };
    responseCache.set(cacheKey, { data: dataToReturn, timestamp: Date.now() });
    return dataToReturn;
  }
  return null;
}

export async function getCryptoData(symbol: string, period: '24h' | 'ytd' = '24h'): Promise<CryptoData | null> {
  const cacheKey = `${symbol}-${period}`;
  const cachedEntry = responseCache.get(cacheKey);

  if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_DURATION)) {
    return cachedEntry.data;
  }

  // Public API URL - no API key parameter needed for basic market data
  // Requesting a broader set of price change percentages; API will return what's available for free tier
  const priceChangePercentages = '24h,7d,14d,30d,60d,200d,1y';
  const url = `${API_BASE_URL}/coins/markets?vs_currency=usd&ids=${symbol}&order=market_cap_desc&per_page=1&page=1&sparkline=false&price_change_percentage=${priceChangePercentages}`;
  
  try {
    console.log(`Fetching crypto data for ${symbol} from ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `Failed to parse error response for ${symbol}` }));
      console.warn(`CoinGecko API error for ${symbol}: ${response.status} ${response.statusText}`, errorData, "Using mock data as fallback.");
      return getMockCryptoData(symbol, period, cacheKey);
    }
    const data: CryptoData[] = await response.json();
    if (data && data.length > 0) {
      const coinData = data[0];
      // The YTD field might be `price_change_percentage_ytd_in_currency` if available, or we use 24h as fallback for display if needed.
      // The component logic already handles displaying appropriate change based on 'showYTD' toggle.
      // Here we just ensure the 24h field is always present.
      const processedData = {
        ...coinData,
        price_change_percentage_24h: coinData.price_change_percentage_24h, // Ensure this is the actual 24h
         // price_change_percentage_ytd_in_currency will be used by component if present
      };
      responseCache.set(cacheKey, { data: processedData, timestamp: Date.now() });
      return processedData;
    }
    console.warn(`No data from CoinGecko API for ${symbol}. Using mock data as fallback.`);
    return getMockCryptoData(symbol, period, cacheKey);
  } catch (error) {
    console.error(`Network or parsing error fetching crypto data for ${symbol}:`, error, "Using mock data as fallback.");
    return getMockCryptoData(symbol, period, cacheKey);
  }
}
