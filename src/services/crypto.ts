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
   * The price change in the last 24 hours.
   */
  priceChange24h: number;
}

/**
 * Asynchronously retrieves crypto market data for a given symbol.
 *
 * @param symbol The symbol of the cryptocurrency to retrieve data for.
 * @returns A promise that resolves to a CryptoData object containing market information.
 */
export async function getCryptoData(symbol: string): Promise<CryptoData> {
  // TODO: Implement this by calling an API.

  return {
    symbol: symbol,
    price: 30000,
    priceChange24h: 1000,
  };
}
