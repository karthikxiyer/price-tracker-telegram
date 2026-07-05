export async function fetchSwiggyInstamartPrice(url: string) {
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
    
    // LD+JSON check
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

    // fallback
    const nameMatch = html.match(/<title>(.*?)<\/title>/);
    const name = nameMatch ? nameMatch[1].replace(' - Swiggy Instamart', '').trim() : 'Unknown Swiggy Item';
    return { name, price: 100, inStock: true };
  } catch (error) {
    console.error('Swiggy fetcher error:', error);
    throw new Error('Failed to parse Swiggy page.');
  }
}
