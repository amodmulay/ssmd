
import { format, startOfYear, subDays } from 'date-fns';

/**
 * Represents bond rate data for a specific period.
 */
export interface BondRatePeriodData {
  /**
   * The name of the bond.
   */
  name: string;
  /**
   * The current rate of the bond (as a decimal, e.g., 0.05 for 5%).
   */
  currentRate: number;
  /**
   * The rate of the bond at the start of the specified period (24h ago or start of year).
   */
  previousRate: number;
}

const API_KEY = process.env.NEXT_PUBLIC_FINANCIAL_MODELING_PREP_API_KEY;

const SUPPORTED_BONDS: { [key: string]: string } = {
  'US 10-Year Treasury': 'year10',
};

const formatDateForFMP = (date: Date) => format(date, 'yyyy-MM-dd');

/**
 * Asynchronously retrieves bond rate data for a given bond and period.
 *
 * @param name The name of the bond to retrieve data for.
 * @param period The period for which to fetch the previous rate ('24h' or 'ytd').
 * @returns A promise that resolves to a BondRatePeriodData object.
 */
export async function getBondRateData(name: string, period: '24h' | 'ytd'): Promise<BondRatePeriodData> {
  if (!API_KEY || API_KEY === 'YOUR_FMP_API_KEY_HERE') {
    console.warn(`FinancialModelingPrep API key is not configured. Returning mock data for bond ${name} (${period}).`);
    const currentRate = Math.random() * 0.1; // 0% to 10%
    let previousRate;
    if (period === '24h') {
      previousRate = currentRate + (Math.random() - 0.5) * 0.005; // +/- 0.25% absolute change
    } else { // ytd
      previousRate = currentRate + (Math.random() - 0.5) * 0.02; // +/- 1% absolute change
    }
    previousRate = Math.max(0, Math.min(0.15, previousRate)); // Clamp mock previous rate
    return {
      name: name,
      currentRate: parseFloat(currentRate.toFixed(4)),
      previousRate: parseFloat(previousRate.toFixed(4)),
    };
  }

  const bondKey = SUPPORTED_BONDS[name];
  if (!bondKey) {
    console.error(`Unsupported bond name: ${name}`);
    throw new Error(`Unsupported bond: ${name}.`);
  }

  try {
    // Fetch current (latest) rate
    const latestRateUrl = `https://financialmodelingprep.com/api/v4/treasury_rates?limit=1&apikey=${API_KEY}`; // limit=1 for safety
    const latestResponse = await fetch(latestRateUrl);
    if (!latestResponse.ok) {
      const errorData = await latestResponse.json().catch(() => ({}));
      console.error(`FMP API error for latest treasury rates: ${latestResponse.status}`, errorData);
      throw new Error(`Failed to fetch latest bond rate data: ${latestResponse.statusText}`);
    }
    const latestDataArray = await latestResponse.json();
    if (!Array.isArray(latestDataArray) || latestDataArray.length === 0 || !latestDataArray[0][bondKey]) {
      throw new Error(`No current rate data returned or invalid format for ${name}`);
    }
    const currentRate = latestDataArray[0][bondKey];

    if (typeof currentRate !== 'number') {
      throw new Error(`Invalid current rate data type for bond ${name}`);
    }

    let previousRateDate: string;
    if (period === '24h') {
      // Get date for 1 day ago (or nearest previous trading day)
      previousRateDate = formatDateForFMP(subDays(new Date(), 1));
    } else { // YTD
      previousRateDate = formatDateForFMP(startOfYear(new Date()));
    }
    
    // FMP might not have data for exact date if it's a weekend/holiday.
    // For 24h, FMP latest gives today's. We need yesterday's.
    // For YTD, we need Jan 1st (or earliest available in Jan).
    // The `/treasury_rates` endpoint with `from` and `to` can be used.
    // To get a single day's rate, set from and to the same date.
    // We fetch a small range to increase chances of getting data if exact day is holiday.
    let queryFromDate = previousRateDate;
    let queryToDate = previousRateDate;

    if (period === '24h') {
        // Fetch for a 3 day window ending yesterday to catch last trading day if yesterday was holiday
        queryToDate = formatDateForFMP(subDays(new Date(), 1));
        queryFromDate = formatDateForFMP(subDays(new Date(), 3));
    } else { // YTD
        queryToDate = formatDateForFMP(subDays(startOfYear(new Date()),-5)); // Jan 1 to Jan 6
        queryFromDate = formatDateForFMP(startOfYear(new Date()));
    }


    const historicalRateUrl = `https://financialmodelingprep.com/api/v4/treasury_rates?from=${queryFromDate}&to=${queryToDate}&apikey=${API_KEY}`;
    const historicalResponse = await fetch(historicalRateUrl);
    let previousRate: number;

    if (!historicalResponse.ok) {
      const errorData = await historicalResponse.json().catch(() => ({}));
      console.warn(`FMP API error for historical treasury rates (${name}, ${period}): ${historicalResponse.status}`, errorData, `Using current rate as previous.`);
      previousRate = currentRate; // Fallback
    } else {
      const historicalDataArray = await historicalResponse.json();
      if (Array.isArray(historicalDataArray) && historicalDataArray.length > 0) {
        // Data is typically sorted with most recent first if multiple dates. We want the one for `previousRateDate`.
        // Or if fetching a range, pick the one closest to target date.
        // For '24h', we want the latest entry in the `queryFromDate` to `queryToDate` range.
        // For 'ytd', we want the earliest entry (closest to Jan 1st) in the `queryFromDate` to `queryToDate` range.
        let foundRateEntry;
        if (period === '24h') {
            foundRateEntry = historicalDataArray[0]; // API returns descending by date, so first is latest in range
        } else { // YTD
            foundRateEntry = historicalDataArray[historicalDataArray.length - 1]; // last one is earliest in range
        }

        if (foundRateEntry && typeof foundRateEntry[bondKey] === 'number') {
          previousRate = foundRateEntry[bondKey];
        } else {
          console.warn(`Historical rate for ${bondKey} not found or invalid on ${previousRateDate}. Using current rate as previous. Data:`, historicalDataArray);
          previousRate = currentRate; // Fallback
        }
      } else {
        console.warn(`No historical rate data returned for ${name} on ${previousRateDate}. Using current rate as previous.`);
        previousRate = currentRate; // Fallback
      }
    }
    
    if (typeof previousRate !== 'number') {
        console.warn(`Invalid previous rate for ${name}, using current rate as fallback.`);
        previousRate = currentRate;
    }

    return {
      name: name,
      currentRate: currentRate,
      previousRate: previousRate,
    };

  } catch (error) {
    console.error(`Error in getBondRateData for ${name} (${period}):`, error);
    throw error;
  }
}
