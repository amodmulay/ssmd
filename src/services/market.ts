/**
 * Represents market data.
 */
export interface MarketData {
  /**
   * The name of the market.
   */
  name: string;
  /**
   * The current value of the market index.
   */
  value: number;
  /**
   * The change in value since the last update.
   */
  change: number;
}

/**
 * Asynchronously retrieves market data for a given market.
 *
 * @param market The name of the market to retrieve data for.
 * @returns A promise that resolves to a MarketData object containing market information.
 */
export async function getMarketData(market: string): Promise<MarketData> {
  // TODO: Implement this by calling an API.

  return {
    name: market,
    value: 10000,
    change: 100,
  };
}
