/**
 * Represents bond rate data.
 */
export interface BondRateData {
  /**
   * The name of the bond.
   */
  name: string;
  /**
   * The current rate of the bond (as a decimal, e.g., 0.05 for 5%).
   */
  rate: number;
}

const API_KEY = process.env.NEXT_PUBLIC_FINANCIAL_MODELING_PREP_API_KEY;

// Currently, this service is hardcoded for US 10-Year Treasury
const SUPPORTED_BONDS: { [key: string]: string } = {
  'US 10-Year Treasury': 'year10', // Maps to the field in FMP treasury_rates response
};

/**
 * Asynchronously retrieves bond rate data for a given bond.
 * Currently only supports 'US 10-Year Treasury'.
 *
 * @param name The name of the bond to retrieve data for.
 * @returns A promise that resolves to a BondRateData object containing bond information.
 */
export async function getBondRateData(name: string): Promise<BondRateData> {
  if (!API_KEY || API_KEY === 'YOUR_FMP_API_KEY_HERE') {
    console.warn('FinancialModelingPrep API key is not configured. Returning mock data for bond rates.');
    // Fallback to mock data or throw an error if API key is missing
    return { name: name, rate: Math.random() * 0.1 };
  }

  const bondKey = SUPPORTED_BONDS[name];
  if (!bondKey) {
    console.error(`Unsupported bond name: ${name}`);
    throw new Error(`Unsupported bond: ${name}. Currently only 'US 10-Year Treasury' is supported.`);
  }

  // FMP's treasury_rates endpoint provides the latest available rates.
  const url = `https://financialmodelingprep.com/api/v4/treasury_rates?apikey=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`FMP API error for treasury rates: ${response.status}`, errorData);
      throw new Error(`Failed to fetch bond rate data: ${response.statusText}`);
    }
    const dataArray = await response.json();

    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      console.error('Unexpected data format or empty response from FMP for treasury rates:', dataArray);
      throw new Error('No data returned for treasury rates');
    }
    
    // The API returns an array, presumably with the latest entry first.
    // We take the first entry.
    const latestRates = dataArray[0]; 

    if (typeof latestRates[bondKey] !== 'number') {
        console.error(`Unexpected data structure in FMP treasury response for ${bondKey}:`, latestRates);
        throw new Error(`Invalid data structure for bond rate ${name}`);
    }

    return {
      name: name,
      rate: latestRates[bondKey], // e.g., latestRates.year10
    };
  } catch (error) {
    console.error(`Error fetching bond rate data for ${name}:`, error);
    throw error;
  }
}
