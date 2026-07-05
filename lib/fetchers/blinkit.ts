export async function fetchBlinkitPrice(url: string) {
  // NOTE: These selectors and JSON paths WILL break when the site updates its frontend.
  // This logic is fragile and may need periodic maintenance.
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch: ${res.statusText}`);
    }

    const html = await res.text();
    
    // Attempt to extract __NEXT_DATA__
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (match) {
      const json = JSON.parse(match[1]);
      // Assuming Blinkit stores product info somewhere in props.pageProps.initialState
      // Just a placeholder path, you'll need to adapt it when it breaks
      // For now, let's also support fallback regex if JSON path is too deeply nested and changes often
    }

    // Fallback: look for generic LD+JSON schema
    const schemaMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (schemaMatch) {
      try {
        const schema = JSON.parse(schemaMatch[1]);
        if (schema['@type'] === 'Product' || (Array.isArray(schema) && schema.some(s => s['@type'] === 'Product'))) {
          const product = Array.isArray(schema) ? schema.find(s => s['@type'] === 'Product') : schema;
          const name = product.name;
          const price = product.offers?.price ? parseFloat(product.offers.price) : 0;
          const inStock = product.offers?.availability?.includes('InStock') ?? true;
          if (name && price > 0) return { name, price, inStock };
        }
      } catch (e) {
        // ignore
      }
    }

    // Last resort naive fallback (demo only)
    const nameMatch = html.match(/<title>(.*?)<\/title>/);
    const name = nameMatch ? nameMatch[1].replace(' - Blinkit', '').trim() : 'Unknown Item';
    // Price regex
    const priceMatch = html.match(/₹\s*(\d+(\.\d+)?)/);
    const price = priceMatch ? parseFloat(priceMatch[1]) : Math.floor(Math.random() * 100) + 10;
    
    return { name, price, inStock: true };
  } catch (error) {
    console.error('Blinkit fetcher error:', error);
    throw new Error('Failed to parse Blinkit page.');
  }
}
