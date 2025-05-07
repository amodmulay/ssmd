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
   * The change in value since the last update (absolute value).
   */
  change: number;
}

const API_KEY = process.env.NEXT_PUBLIC_FINANCIAL_MODELING_PREP_API_KEY;

// Mapping display names to FMP API symbols
const MARKET_SYMBOL_MAP: { [key: string]: string } = {
  'S&P 500': '%5EGSPC', // URL encoded ^GSPC
  'NASDAQ': '%5EIXIC', // URL encoded ^IXIC (NASDAQ Composite)
  'FTSE 100': '%5EFTSE', // URL encoded ^FTSE
  'DAX': '%5EGDAXI', // URL encoded ^GDAXI (DAX Performance Index)
  'CAC 40': '%5EFCHI', // URL encoded ^FCHI
  'Nikkei 225': '%5EN225', // URL encoded ^N225
  'Hang Seng': '%5EHSI', // URL encoded ^HSI
  'Shanghai Composite': '000001.SS', // SSE Composite Index on FMP (already URL safe)
  'Nifty 50': '%5ENSEI', // URL encoded ^NSEI (NIFTY 50 on FMP)
  'STI': '%5ESTI', // URL encoded ^STI (Straits Times Index on FMP)
};

/**
 * Asynchronously retrieves market data for a given market.
 *
 * @param market The name of the market to retrieve data for.
 * @returns A promise that resolves to a MarketData object containing market information.
 */
export async function getMarketData(market: string): Promise<MarketData> {
  if (!API_KEY || API_KEY === 'YOUR_FMP_API_KEY_HERE') {
    console.warn('FinancialModelingPrep API key is not configured. Returning mock data for markets.');
    // Fallback to mock data or throw an error if API key is missing
    return { name: market, value: Math.random() * 10000, change: (Math.random() - 0.5) * 200 };
  }

  const apiSymbol = MARKET_SYMBOL_MAP[market] || market;
  const url = `https://financialmodelingprep.com/api/v3/quote/${apiSymbol}?apikey=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`FMP API error for market ${market} (${apiSymbol}): ${response.status}`, errorData);
      throw new Error(`Failed to fetch market data for ${market}: ${response.statusText}`);
    }
    const dataArray = await response.json();

    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      console.error(`Unexpected data format or empty response from FMP for ${market} (${apiSymbol}):`, dataArray);
      throw new Error(`No data returned for market ${market}`);
    }

    const marketInfo = dataArray[0];

    if (typeof marketInfo.price !== 'number' || typeof marketInfo.change !== 'number') {
        console.error(`Unexpected data structure in FMP response for ${market} (${apiSymbol}):`, marketInfo);
        throw new Error(`Invalid data structure for market ${market}`);
    }
    
    return {
      name: marketInfo.name || market, // Use API name if available, else fallback to input market name
      value: marketInfo.price,
      change: marketInfo.change,
    };
  } catch (error) {
    console.error(`Error fetching market data for ${market} (${apiSymbol}):`, error);
    throw error;
  }
}
