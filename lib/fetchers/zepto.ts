import { createContext } from './browser';

/**
 * Zepto fetcher using Playwright.
 *
 * NOTE: Zepto's web product page (www.zepto.com/pn/...) requires an authenticated
 * user session with a selected delivery location to load product pricing.
 * Without authentication, the page returns "₹0" and no product API is called.
 *
 * This fetcher handles Zepto as best as possible:
 * 1. Attempts to intercept any BFF product API calls (works only if a session cookie exists)
 * 2. Falls back to parsing the page title (which may contain ₹0 without a session)
 *
 * For reliable Zepto tracking, a ScraperAPI or residential proxy is recommended.
 */
export async function fetchZeptoPrice(url: string): Promise<{ name: string; price: number; inStock: boolean }> {
  const { browser, context } = await createContext();

  try {
    const page = await context.newPage();
    let productData: { name: string; price: number; inStock: boolean } | null = null;

    const normalizedUrl = url
      .replace('www.zeptonow.com', 'www.zepto.com')
      .replace('zeptonow.com', 'zepto.com');

    // Extract pvid for targeted interception
    const pvid = url.match(/pvid\/([\w-]+)/)?.[1] ?? '';
    const slug = url.match(/\/pn\/([\w-]+)\//)?.[1]?.replace(/-/g, ' ') ?? '';

    page.on('response', async (response) => {
      const resUrl = response.url();
      if (response.status() !== 200) return;

      if (resUrl.includes('bff-gateway.zepto.com') || resUrl.includes('api.zepto')) {
        try {
          const json = await response.json();
          const raw = JSON.stringify(json);

          // Only look at responses that contain the product pvid (product-specific calls)
          if (pvid && !raw.includes(pvid.substring(0, 8))) return;

          const nameMatch = raw.match(/"(?:displayName|product_name|name)"\s*:\s*"([^"]{5,100})"/);
          const priceMatch = raw.match(/"(?:sellingPrice|selling_price|mrp|price)"\s*:\s*([0-9]+(?:\.[0-9]+)?)/);

          if (nameMatch && priceMatch && !productData) {
            const rawPrice = parseFloat(priceMatch[1]);
            const price = rawPrice > 5000 ? rawPrice / 100 : rawPrice;
            if (price > 0) {
              productData = {
                name: nameMatch[1],
                price,
                inStock: !raw.includes('"out_of_stock":true'),
              };
            }
          }
        } catch { /* not JSON */ }
      }
    });

    // Visit homepage to establish session, then navigate to product
    await page.goto('https://www.zepto.com/', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.goto(normalizedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    if (productData) return productData;

    // Fallback: parse title
    // Authenticated title: "Milky Mist SKYR High Protein Yogurt - Buy at ₹315 Online | ..."
    // Unauthenticated title: " - Buy  at ₹0 Online | ..."
    const title = await page.title();
    const titleNameMatch = title.match(/^([^-]{5,})\s*-\s*Buy/i);
    const titlePriceMatch = title.match(/₹\s*([0-9,]+)/);

    if (titleNameMatch && titlePriceMatch) {
      const name = titleNameMatch[1].trim();
      const price = parseFloat(titlePriceMatch[1].replace(/,/g, ''));
      if (name && price > 0) return { name, price, inStock: true };
    }

    // If price is 0 (unauthenticated), derive name from slug and throw a specific error
    if (slug) {
      const name = slug.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      throw new Error(
        `Zepto product page returned ₹0 — this indicates no user session/store selection. ` +
        `Product identified as "${name}" but price could not be fetched. ` +
        `A ScraperAPI integration is needed for reliable Zepto tracking.`
      );
    }

    throw new Error('Could not extract Zepto product details');
  } catch (error) {
    console.error('Zepto fetcher error:', error);
    throw new Error('Failed to parse Zepto page.');
  } finally {
    await browser.close();
  }
}
