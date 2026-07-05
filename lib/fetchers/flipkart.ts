export async function fetchFlipkartPrice(url: string): Promise<{ name: string; price: number; inStock: boolean }> {
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
    const name = nameMatch ? nameMatch[1].split('|')[0].trim() : 'Unknown Flipkart Item';
    
    // Flipkart naive parsing
    let price = 50;
    const priceMatch = html.match(/<div class="Nx9bqj CxhGGd">₹([^<]+)<\/div>/) || html.match(/₹([0-9,]+)/);
    if (priceMatch) {
      price = parseFloat(priceMatch[1].replace(/,/g, ''));
    }

    const inStock = !html.includes('Sold Out');

    return { name, price, inStock };
  } catch (error) {
    console.error('Flipkart fetcher error:', error);
    throw new Error('Failed to parse Flipkart page.');
  }
}
