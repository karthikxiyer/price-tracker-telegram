// To run this standalone, you might need to use `ts-node` or compile it first.
// We'll configure tsx in package.json or run it using `npx tsx scripts/check-prices.ts`.

import { createClient } from '@supabase/supabase-js';
import { sendTelegramAlert } from '../lib/telegram';
import { fetchBlinkitPrice } from '../lib/fetchers/blinkit';
import { fetchZeptoPrice } from '../lib/fetchers/zepto';
import { fetchSwiggyInstamartPrice } from '../lib/fetchers/swiggy';
import { fetchAmazonPrice } from '../lib/fetchers/amazon';
import { fetchFlipkartPrice } from '../lib/fetchers/flipkart';
import { fetchBigbasketPrice } from '../lib/fetchers/bigbasket';

// Load environment variables if running locally via dotenv (in Actions, they are set in env)
// require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Starting price check...');
  
  const { data: items, error } = await supabase.from('items').select('*');
  
  if (error) {
    console.error('Failed to fetch items:', error);
    process.exit(1);
  }
  
  if (!items || items.length === 0) {
    console.log('No items to check.');
    return;
  }
  
  for (const item of items) {
    try {
      console.log(`Checking ${item.platform} item: ${item.name || item.id}`);
      let fetcher;
      
      switch (item.platform) {
        case 'blinkit':
          fetcher = fetchBlinkitPrice;
          break;
        case 'zepto':
          fetcher = fetchZeptoPrice;
          break;
        case 'swiggy':
          fetcher = fetchSwiggyInstamartPrice;
          break;
        case 'amazon':
          fetcher = fetchAmazonPrice;
          break;
        case 'flipkart':
          fetcher = fetchFlipkartPrice;
          break;
        case 'bigbasket':
          fetcher = fetchBigbasketPrice;
          break;
        default:
          console.log(`Unknown platform ${item.platform} for item ${item.id}`);
          continue;
      }
      
      const { price: newPrice, inStock } = await fetcher(item.url);
      console.log(`Fetched price: ${newPrice}, DB price: ${item.current_price}`);
      
      if (newPrice !== item.current_price) {
        const direction = newPrice < item.current_price ? '🔻' : '🔺';
        const message = `
<b>${item.name}</b> on ${item.platform}
Price changed: ₹${item.current_price} → <b>₹${newPrice}</b> ${direction}
<a href="${item.url}">View Product</a>
        `.trim();
        
        await sendTelegramAlert(message);
        
        // Update DB
        await supabase
          .from('items')
          .update({
            last_price: item.current_price,
            current_price: newPrice,
            last_checked: new Date().toISOString()
          })
          .eq('id', item.id);
          
        await supabase
          .from('price_history')
          .insert([{
            item_id: item.id,
            price: newPrice
          }]);
          
        console.log(`Price updated for ${item.name}`);
      } else {
        // Just update last_checked
        await supabase
          .from('items')
          .update({
            last_checked: new Date().toISOString()
          })
          .eq('id', item.id);
      }
      
      // Delay between requests to be nice
      await new Promise(res => setTimeout(res, 2000));
      
    } catch (err: any) {
      console.error(`Error checking item ${item.id}:`, err.message);
    }
  }
  
  console.log('Finished price check.');
}

run().catch(console.error);
