/**
 * Represents bond rate data.
 */
export interface BondRateData {
  /**
   * The name of the bond.
   */
  name: string;
  /**
   * The current rate of the bond.
   */
  rate: number;
}

/**
 * Asynchronously retrieves bond rate data for a given bond.
 *
 * @param name The name of the bond to retrieve data for.
 * @returns A promise that resolves to a BondRateData object containing bond information.
 */
export async function getBondRateData(name: string): Promise<BondRateData> {
  // TODO: Implement this by calling an API.

  return {
    name: name,
    rate: 0.05,
  };
}
