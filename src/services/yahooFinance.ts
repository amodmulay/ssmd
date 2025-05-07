import axios from 'axios';

interface FinancialData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  // Add other relevant data fields
}

interface MarketData {
  market: string;
  data: FinancialData[];
}

const BASE_URL = 'YOUR_API_BASE_URL'; // Replace with the actual API base URL
const API_KEY = 'YOUR_API_KEY'; // Replace with your API key

export const fetchFinancialData = async (
  symbols: string | string[],
  market?: 'US' | 'EU' | 'Asian',
  isCrypto: boolean = false
): Promise<FinancialData[] | MarketData | null> => {
  try {
    const symbolList = Array.isArray(symbols) ? symbols.join(',') : symbols;
    const endpoint = isCrypto ? '/crypto' : '/stocks';
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      params: {
        symbols: symbolList,
        market: market, // Pass market parameter if applicable
        apiKey: API_KEY,
      },
    });

    if (response.data && response.data.data) {
      // Assuming the API response structure has a 'data' field containing the financial data
      return response.data.data as FinancialData[] | MarketData;
    } else {
      console.error('Error fetching financial data: Invalid response format');
      return null;
    }
  } catch (error) {
    console.error('Error fetching financial data:', error);
    return null;
  }
};

// Example usage:
// async function getUSStocks() {
//   const usStocks = await fetchFinancialData(['AAPL', 'MSFT'], 'US');
//   console.log('US Stocks:', usStocks);
// }

// async function getCryptoData() {
//   const cryptoData = await fetchFinancialData('BTCUSDT', undefined, true);
//   console.log('Crypto Data:', cryptoData);
// }

// getUSStocks();
// getCryptoData();