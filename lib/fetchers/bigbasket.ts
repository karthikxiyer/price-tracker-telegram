import { parse } from 'node:path';

export async function fetchBigbasketPrice(url: string): Promise<{ name: string; price: number; inStock: boolean }> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
      },
    });

    if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
    const html = await res.text();

    // Naive parsing for Big Basket
    const nameMatch = html.match(/<title>(.*?)<\/title>/);
    const name = nameMatch ? nameMatch[1].split('|')[0].trim() : 'Unknown Bigbasket Item';
    
    // Attempt to find schema.org/Product
    const schemaMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    let price = 50;
    if (schemaMatch) {
      try {
        const schema = JSON.parse(schemaMatch[1]);
        if (schema.offers && schema.offers.price) {
          price = parseFloat(schema.offers.price);
        }
      } catch (e) {}
    }

    const inStock = !html.includes('Out of Stock');

    return { name, price, inStock };
  } catch (error) {
    console.error('Bigbasket fetcher error:', error);
    throw new Error('Failed to parse Bigbasket page.');
  }
}
