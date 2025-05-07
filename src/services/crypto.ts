
import { format } from 'date-fns';

/**
 * Represents crypto market data for a specific period.
 */
export interface CryptoPeriodData {
  /**
   * The symbol of the cryptocurrency.
   */
  symbol: string;
  /**
   * The current price of the cryptocurrency.
   */
  currentPrice: number;
  /**
   * The price of the cryptocurrency at the start of the specified period (24h ago or start of year).
   */
  previousPrice: number;
}

const SYMBOL_TO_ID_MAP: { [key: string]: string } = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
};

const getYesterdayDateDDMMYYYY = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return format(date, 'dd-MM-yyyy');
};

const getStartOfYearDateDDMMYYYY = () => {
  const date = new Date();
  return `01-01-${format(date, 'yyyy')}`;
};

/**
 * Asynchronously retrieves crypto market data for a given symbol and period.
 *
 * @param symbol The symbol of the cryptocurrency to retrieve data for (e.g., BTC, ETH).
 * @param period The period for which to fetch the previous price ('24h' or 'ytd').
 * @returns A promise that resolves to a CryptoPeriodData object.
 */
export async function getCryptoData(symbol: string, period: '24h' | 'ytd'): Promise<CryptoPeriodData> {
  const coinId = SYMBOL_TO_ID_MAP[symbol.toUpperCase()];
  if (!coinId) {
    console.error(`Unsupported crypto symbol: ${symbol}`);
    throw new Error(`Unsupported crypto symbol: ${symbol}`);
  }

  // Mock data logic
  if (!process.env.NEXT_PUBLIC_COINGECKO_API_KEY && process.env.NEXT_PUBLIC_FINANCIAL_MODELING_PREP_API_KEY === 'YOUR_FMP_API_KEY_HERE') {
     console.warn(`CoinGecko API key not available and FMP key is placeholder. Returning mock data for crypto ${symbol} (${period}).`);
    const currentPrice = Math.random() * 50000 + 1000;
    let previousPrice;
    if (period === '24h') {
      previousPrice = currentPrice * (1 + (Math.random() - 0.5) * 0.1); // +/- 5%
    } else { // ytd
      previousPrice = currentPrice * (1 + (Math.random() - 0.5) * 0.5); // +/- 25%
    }
    return {
      symbol: symbol.toUpperCase(),
      currentPrice: parseFloat(currentPrice.toFixed(2)),
      previousPrice: parseFloat(previousPrice.toFixed(2)),
    };
  }


  try {
    // Fetch current price
    const currentPriceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
    const currentPriceResponse = await fetch(currentPriceUrl);
    if (!currentPriceResponse.ok) {
      const errorData = await currentPriceResponse.json().catch(() => ({}));
      console.error(`CoinGecko API error for current price of ${symbol}: ${currentPriceResponse.status}`, errorData);
      throw new Error(`Failed to fetch current crypto price for ${symbol}: ${currentPriceResponse.statusText}`);
    }
    const currentPriceData = await currentPriceResponse.json();
    const currentPrice = currentPriceData[coinId]?.usd;

    if (typeof currentPrice !== 'number') {
      console.error(`Unexpected current price data format from CoinGecko for ${symbol}:`, currentPriceData);
      throw new Error(`Unexpected current price data format for ${symbol}`);
    }

    // Fetch historical price for the start of the period
    const dateForHistory = period === '24h' ? getYesterdayDateDDMMYYYY() : getStartOfYearDateDDMMYYYY();
    const historicalPriceUrl = `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${dateForHistory}&localization=false`;
    
    const historicalPriceResponse = await fetch(historicalPriceUrl);
    if (!historicalPriceResponse.ok) {
      // If YTD fails for a new coin, it might not have history for Jan 1st.
      // Or if 24h fails (e.g. new listing today), use current price as previous to show 0 change.
      if (historicalPriceResponse.status === 404 || historicalPriceResponse.status === 400) { // 400 can be for bad date (e.g. future)
        console.warn(`Historical data not found for ${symbol} on ${dateForHistory}. Using current price as previous price.`);
         return {
          symbol: symbol.toUpperCase(),
          currentPrice: currentPrice,
          previousPrice: currentPrice, // Assume no change if history is missing
        };
      }
      const errorData = await historicalPriceResponse.json().catch(() => ({}));
      console.error(`CoinGecko API error for historical price of ${symbol} on ${dateForHistory}: ${historicalPriceResponse.status}`, errorData);
      throw new Error(`Failed to fetch historical crypto price for ${symbol}: ${historicalPriceResponse.statusText}`);
    }
    const historicalPriceData = await historicalPriceResponse.json();
    const previousPrice = historicalPriceData?.market_data?.current_price?.usd;

    if (typeof previousPrice !== 'number') {
       // If historical data is present but no USD price (e.g. coin listed after date, or API error)
      console.warn(`Historical USD price not found for ${symbol} on ${dateForHistory}. Data:`, historicalPriceData, `Using current price as previous price.`);
      return {
        symbol: symbol.toUpperCase(),
        currentPrice: currentPrice,
        previousPrice: currentPrice, // Assume no change
      };
    }

    return {
      symbol: symbol.toUpperCase(),
      currentPrice: currentPrice,
      previousPrice: previousPrice,
    };

  } catch (error) {
    console.error(`Error in getCryptoData for ${symbol} (${period}):`, error);
    throw error;
  }
}
