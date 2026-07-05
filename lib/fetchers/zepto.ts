export async function fetchZeptoPrice(url: string) {
  // NOTE: These selectors and JSON paths WILL break when the site updates its frontend.
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);

    const html = await res.text();
    
    // LD+JSON approach
    const schemaMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (schemaMatch) {
      try {
        const schema = JSON.parse(schemaMatch[1]);
        if (schema['@type'] === 'Product') {
          return {
            name: schema.name,
            price: parseFloat(schema.offers?.price || '0'),
            inStock: schema.offers?.availability?.includes('InStock') ?? true
          };
        }
      } catch (e) {}
    }

    // Zepto specific parsing from __next_f stream
    const nameRegex = /\\?"content\\?":\\?"([^"\\]+)\\?",\\?"itemProp\\?":\\?"name\\?"/;
    const priceRegex = /\\?"content\\?":\\?"(\d+(?:\.\d+)?)\\?",\\?"itemProp\\?":\\?"price\\?"/;
    
    const nameMatch = html.match(nameRegex);
    const priceMatch = html.match(priceRegex);
    
    const name = nameMatch ? nameMatch[1] : 'Unknown Zepto Item';
    const price = priceMatch ? parseFloat(priceMatch[1]) : 50;
    const inStock = html.includes('InStock');

    return { name, price, inStock };
  } catch (error) {
    console.error('Zepto fetcher error:', error);
    throw new Error('Failed to parse Zepto page.');
  }
}
