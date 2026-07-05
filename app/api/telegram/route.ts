import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendTelegramAlert } from '@/lib/telegram';
import { fetchBlinkitPrice } from '@/lib/fetchers/blinkit';
import { fetchZeptoPrice } from '@/lib/fetchers/zepto';
import { fetchSwiggyInstamartPrice } from '@/lib/fetchers/swiggy';
import { fetchAmazonPrice } from '@/lib/fetchers/amazon';
import { fetchFlipkartPrice } from '@/lib/fetchers/flipkart';
import { fetchBigbasketPrice } from '@/lib/fetchers/bigbasket';

export async function POST(request: Request) {
  try {
    const update = await request.json();
    
    // Validate it's a message
    if (!update.message || !update.message.text) {
      return NextResponse.json({ ok: true }); // Acknowledge to Telegram
    }

    const chatId = update.message.chat.id.toString();
    const expectedChatId = process.env.TELEGRAM_CHAT_ID;

    // Only allow authorized users
    if (chatId !== expectedChatId) {
      console.warn(`Unauthorized chat access attempt from ${chatId}`);
      return NextResponse.json({ ok: true }); 
    }

    const text = update.message.text.trim();

    if (text.startsWith('/list')) {
      const { data, error } = await supabase.from('items').select('*').order('created_at', { ascending: false });
      if (error || !data || data.length === 0) {
        await sendTelegramAlert('You are not tracking any items right now.');
        return NextResponse.json({ ok: true });
      }
      const listText = data.map((item, i) => `${i + 1}. <b>${item.name}</b> (₹${item.current_price})\n🔗 <a href="${item.url}">Link</a>`).join('\n\n');
      await sendTelegramAlert(`📋 <b>Tracked Items:</b>\n\n${listText}\n\n<i>To delete an item, reply with:</i>\n/delete <url>`);
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith('/delete')) {
      const deleteUrlMatch = text.match(/https?:\/\/[^\s]+/);
      if (!deleteUrlMatch) {
        await sendTelegramAlert('Please provide the URL to delete. Example:\n/delete https://swiggy.com/...');
        return NextResponse.json({ ok: true });
      }
      const { error } = await supabase.from('items').delete().eq('url', deleteUrlMatch[0]);
      if (error) {
        await sendTelegramAlert('Failed to delete item from database.');
      } else {
        await sendTelegramAlert('🗑️ Item successfully deleted from tracking!');
      }
      return NextResponse.json({ ok: true });
    }

    const urlMatch = text.match(/https?:\/\/[^\s]+/);

    if (!urlMatch) {
      await sendTelegramAlert('I only understand product URLs or commands like /list and /delete. Please paste a supported store link.');
      return NextResponse.json({ ok: true });
    }

    const url = urlMatch[0];
    let platform = '';
    let fetcher = null;

    if (url.includes('blinkit.com')) {
      platform = 'blinkit';
      fetcher = fetchBlinkitPrice;
    } else if (url.includes('zeptonow.com') || url.includes('zepto.com')) {
      platform = 'zepto';
      fetcher = fetchZeptoPrice;
    } else if (url.includes('swiggy.com') || url.includes('instamart.in')) {
      platform = 'swiggy';
      fetcher = fetchSwiggyInstamartPrice;
    } else if (url.includes('amazon.in') || url.includes('amazon.com')) {
      platform = 'amazon';
      fetcher = fetchAmazonPrice;
    } else if (url.includes('flipkart.com')) {
      platform = 'flipkart';
      fetcher = fetchFlipkartPrice;
    } else if (url.includes('bigbasket.com')) {
      platform = 'bigbasket';
      fetcher = fetchBigbasketPrice;
    } else {
      await sendTelegramAlert('Sorry, I do not support this platform yet.');
      return NextResponse.json({ ok: true });
    }

    await sendTelegramAlert('Fetching product details... ⏳');

    const data = await fetcher(url);

    if (!data.name || !data.price) {
      await sendTelegramAlert('Failed to extract product details from that URL.');
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabase
      .from('items')
      .insert([{
        url,
        platform,
        name: data.name,
        current_price: data.price,
        first_seen_price: data.price,
        in_stock: data.inStock
      }]);

    if (error) {
      await sendTelegramAlert('Database error while saving the item.');
      return NextResponse.json({ ok: true });
    }

    await sendTelegramAlert(`✅ Successfully started tracking:\n\n<b>${data.name}</b>\nPlatform: ${platform}\nCurrent Price: ₹${data.price}`);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Telegram Webhook Error:', error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
