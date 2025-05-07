import axios from 'axios';
import cheerio from 'cheerio';

async function scrapeFinancialData(url: string, symbol: string): Promise<string> {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // The class names might change, so inspect the Yahoo Finance page
    // to find the current correct class names for the stock price.
    // Example:
    // <fin-streamer class="Fw(b) Fz(36px) Mb(-4px) D(ib)" data-field="regularMarketPrice" data-symbol="AAPL" value="172.34" active="" style=""></fin-streamer>
    const priceElement = $(`fin-streamer[data-symbol="${symbol}"]`);

    if (priceElement.length > 0) {
      const scrapedData = priceElement.attr('value');
      if (scrapedData) {
        return scrapedData;
      }
    }
    const scrapedData = 'Price not found';

    return scrapedData;
  } catch (error: any) {
    console.error(`Error scraping data from ${url}: ${error.message}`);
    throw error;
  }
}