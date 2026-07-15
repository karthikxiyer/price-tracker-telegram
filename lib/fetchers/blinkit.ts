import { chromium } from 'playwright';
import { createContext } from './browser';

/**
 * Extracts the product ID from a Blinkit URL.
 * Supports:
 *   https://blinkit.com/prn/<slug>/prid/<id>
 *   https://blinkit.com/.../prid/<id>
 */
function extractPrid(url: string): string | null {
  const m = url.match(/prid\/([0-9]+)/);
  return m ? m[1] : null;
}

export async function fetchBlinkitPrice(url: string): Promise<{ name: string; price: number; inStock: boolean }> {
  const prid = extractPrid(url);

  // Strategy 1: Direct internal API (no browser needed) — works when called from
  //   within a browser session context. We use Playwright to make the page load
  //   and intercept the API call it makes automatically.
  const { browser, context } = await createContext();

  try {
    const page = await context.newPage();
    let productData: { name: string; price: number; inStock: boolean } | null = null;

    page.on('response', async (response) => {
      const resUrl = response.url();
      // Intercept the product layout API call Blinkit makes client-side
      if (resUrl.includes('blinkit.com/v1/layout/product') && response.status() === 200) {
        try {
          const json = await response.json();
          const raw = JSON.stringify(json);
          // The structure: {"name":"...", "price": 300, "mrp": 350, "state": "available"}
          const nameMatch = raw.match(/"name"\s*:\s*"([^"]{3,})".*?"price"\s*:\s*([0-9]+)/);
          const priceMatch = raw.match(/"price"\s*:\s*([0-9]+(?:\.[0-9]+)?)/);
          const nameMatch2 = raw.match(/"express".*?"name"\s*:\s*"([^"]{5,100})"/);
          const inStock = !raw.includes('"state":"unavailable"') && !raw.includes('"out_of_stock":true');

          let name = 'Unknown Blinkit Item';
          let price = 0;

          if (nameMatch) {
            name = nameMatch[1];
            price = parseFloat(nameMatch[2]);
          } else if (priceMatch && nameMatch2) {
            name = nameMatch2[1];
            price = parseFloat(priceMatch[1]);
          }

          if (!productData && name !== 'Unknown Blinkit Item' && price > 0) {
            productData = { name, price, inStock };
          }
        } catch { /* JSON parse failed */ }
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait for client-side API calls to complete
    await page.waitForTimeout(4000);

    if (productData) return productData;

    // Fallback: read from the rendered DOM
    const title = await page.title();
    const name = title.replace(/Price\s*-\s*Buy Online.*$/i, '').replace(/\s*\|\s*Blinkit$/i, '').trim();
    const priceEl = await page.$eval('[class*="Product__UpdatedPrice"], [class*="price"]', 
      (el: HTMLElement) => el.textContent?.replace(/[^0-9.]/g, '') ?? '').catch(() => '');
    const price = priceEl ? parseFloat(priceEl) : 0;

    if (!name || price === 0) throw new Error('Could not extract product details from Blinkit page');

    return { name, price, inStock: true };
  } finally {
    await browser.close();
  }
}
