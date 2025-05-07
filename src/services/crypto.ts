/**
 * Represents crypto market data.
 */
export interface CryptoData {
  /**
   * The symbol of the cryptocurrency.
   */
  symbol: string;
  /**
   * The current price of the cryptocurrency.
   */
  price: number;
  /**
   * The price change in the last 24 hours (absolute value).
   */
  priceChange24h: number;
}

const SYMBOL_TO_ID_MAP: { [key: string]: string } = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
};

/**
 * Asynchronously retrieves crypto market data for a given symbol.
 *
 * @param symbol The symbol of the cryptocurrency to retrieve data for (e.g., BTC, ETH).
 * @returns A promise that resolves to a CryptoData object containing market information.
 */
export async function getCryptoData(symbol: string): Promise<CryptoData> {
  const coinId = SYMBOL_TO_ID_MAP[symbol.toUpperCase()];
  if (!coinId) {
    console.error(`Unsupported crypto symbol: ${symbol}`);
    throw new Error(`Unsupported crypto symbol: ${symbol}`);
  }

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`CoinGecko API error for ${symbol}: ${response.status}`, errorData);
      throw new Error(`Failed to fetch crypto data for ${symbol}: ${response.statusText}`);
    }
    const data = await response.json();

    if (!data[coinId] || data[coinId].usd === undefined || data[coinId].usd_24h_change === undefined) {
      console.error(`Unexpected data format from CoinGecko for ${symbol}:`, data);
      throw new Error(`Unexpected data format for ${symbol}`);
    }

    const price = data[coinId].usd;
    const priceChange24hPercent = data[coinId].usd_24h_change;
    // Calculate absolute change: currentPrice * (percentageChange / 100)
    const priceChange24hAbsolute = price * (priceChange24hPercent / 100);
    
    return {
      symbol: symbol.toUpperCase(),
      price: price,
      priceChange24h: priceChange24hAbsolute,
    };
  } catch (error) {
    console.error(`Error fetching crypto data for ${symbol}:`, error);
    // Re-throw or return a specific error structure if components need to handle it differently
    throw error; 
  }
}
