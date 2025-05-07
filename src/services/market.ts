
import { format, startOfYear, subDays } from 'date-fns';

/**
 * Represents market data for a specific period.
 */
export interface MarketPeriodData {
  /**
   * The name of the market.
   */
  name: string;
  /**
   * The current value of the market index.
   */
  currentValue: number;
  /**
   * The value of the market index at the start of the specified period (24h ago/previous trading day or start of year).
   */
  previousValue: number;
}

const API_KEY = process.env.NEXT_PUBLIC_FINANCIAL_MODELING_PREP_API_KEY;

const MARKET_SYMBOL_MAP: { [key: string]: string } = {
  'S&P 500': '%5EGSPC',
  'NASDAQ': '%5EIXIC',
  'FTSE 100': '%5EFTSE',
  'DAX': '%5EGDAXI',
  'CAC 40': '%5EFCHI',
  'Nikkei 225': '%5EN225',
  'Hang Seng': '%5EHSI',
  'Shanghai Composite': '000001.SS',
  'Nifty 50': '%5ENSEI',
  'STI': '%5ESTI',
};

const formatDateForFMP = (date: Date) => format(date, 'yyyy-MM-dd');

/**
 * Asynchronously retrieves market data for a given market and period.
 *
 * @param market The name of the market to retrieve data for.
 * @param period The period for which to fetch the previous value ('24h' or 'ytd').
 * @returns A promise that resolves to a MarketPeriodData object.
 */
export async function getMarketData(market: string, period: '24h' | 'ytd'): Promise<MarketPeriodData> {
  if (!API_KEY || API_KEY === 'YOUR_FMP_API_KEY_HERE') {
    console.warn(`FinancialModelingPrep API key is not configured. Returning mock data for market ${market} (${period}).`);
    const currentValue = Math.random() * 10000 + 1000;
    let previousValue;
    if (period === '24h') {
      previousValue = currentValue * (1 + (Math.random() - 0.5) * 0.1); // +/- 5%
    } else { // ytd
      previousValue = currentValue * (1 + (Math.random() - 0.5) * 0.5); // +/- 25%
    }
    return {
      name: market,
      currentValue: parseFloat(currentValue.toFixed(2)),
      previousValue: parseFloat(previousValue.toFixed(2)),
    };
  }

  const apiSymbol = MARKET_SYMBOL_MAP[market] || market;

  try {
    // Fetch current quote (includes current price and previous day's close)
    const quoteUrl = `https://financialmodelingprep.com/api/v3/quote/${apiSymbol}?apikey=${API_KEY}`;
    const quoteResponse = await fetch(quoteUrl);
    if (!quoteResponse.ok) {
      const errorData = await quoteResponse.json().catch(() => ({}));
      console.error(`FMP API error for current quote of ${market} (${apiSymbol}): ${quoteResponse.status}`, errorData);
      throw new Error(`Failed to fetch current market data for ${market}: ${quoteResponse.statusText}`);
    }
    const quoteDataArray = await quoteResponse.json();
    if (!Array.isArray(quoteDataArray) || quoteDataArray.length === 0) {
      throw new Error(`No current quote data returned for market ${market}`);
    }
    const marketInfo = quoteDataArray[0];
    const currentValue = marketInfo.price;

    if (typeof currentValue !== 'number') {
      throw new Error(`Invalid current value data type for market ${market}`);
    }

    let previousValue: number;

    if (period === '24h') {
      // FMP's `previousClose` is a good proxy for 24h ago price for markets
      previousValue = marketInfo.previousClose;
      if (typeof previousValue !== 'number') {
        console.warn(`Previous close not available for ${market}, using current value as fallback for 24h period.`);
        previousValue = currentValue; // Fallback if previousClose is not available
      }
    } else { // YTD
      const today = new Date();
      const startDateOfYear = formatDateForFMP(startOfYear(today));
      // Fetch historical data for the start of the year
      // To be safe, fetch a small range around start of year in case Jan 1 was a holiday
      const startDateRangeBegin = formatDateForFMP(startOfYear(today));
      const startDateRangeEnd = formatDateForFMP(subDays(startOfYear(today),-5)); // Jan 1 to Jan 6
      
      const historicalUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/${apiSymbol}?from=${startDateRangeBegin}&to=${startDateRangeEnd}&apikey=${API_KEY}`;
      const historicalResponse = await fetch(historicalUrl);
      if (!historicalResponse.ok) {
        const errorData = await historicalResponse.json().catch(() => ({}));
        console.error(`FMP API error for YTD historical data of ${market} (${apiSymbol}): ${historicalResponse.status}`, errorData);
        // Fallback: use current value if YTD historical fetch fails
        console.warn(`Failed to fetch YTD historical data for ${market}. Using current value as previous value.`);
        previousValue = currentValue;
      } else {
        const historicalData = await historicalResponse.json();
        if (historicalData.historical && historicalData.historical.length > 0) {
          // FMP historical data is typically sorted descending by date if multiple dates returned. We want the earliest.
          // Or, if specific date like 'YYYY-01-01' given and it was a trading day, it should be the one.
          // For a range, find the entry closest to Jan 1st, typically the last in the array if sorted ascending, or first if descending.
          // FMP historical-price-full returns data sorted ascending by date. So take first element.
          previousValue = historicalData.historical[0].close;
        } else {
           console.warn(`No YTD historical data found for ${market} around ${startDateRangeBegin}. Using current value as previous value.`);
          previousValue = currentValue; // Fallback if no historical data
        }
      }
       if (typeof previousValue !== 'number') {
        console.warn(`Invalid YTD previous value for ${market}, using current value as fallback.`);
        previousValue = currentValue;
      }
    }

    return {
      name: marketInfo.name || market,
      currentValue: currentValue,
      previousValue: previousValue,
    };

  } catch (error) {
    console.error(`Error in getMarketData for ${market} (${apiSymbol}, ${period}):`, error);
    throw error;
  }
}
