export async function fetchAmazonPrice(url: string): Promise<{ name: string; price: number; inStock: boolean }> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
      },
    });

    if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
    const html = await res.text();

    const nameMatch = html.match(/<title>(.*?)<\/title>/);
    const name = nameMatch ? nameMatch[1].replace('Amazon.in: ', '').trim() : 'Unknown Amazon Item';
    
    // Amazon uses complex DOM, naive fallback
    let price = 50;
    const priceMatch = html.match(/<span class="a-price-whole">([^<]+)<\/span>/);
    if (priceMatch) {
      price = parseFloat(priceMatch[1].replace(/,/g, ''));
    }

    const inStock = !html.includes('Currently unavailable');

    return { name, price, inStock };
  } catch (error) {
    console.error('Amazon fetcher error:', error);
    throw new Error('Failed to parse Amazon page.');
  }
}
