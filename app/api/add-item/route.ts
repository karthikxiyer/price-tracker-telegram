import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchBlinkitPrice } from '@/lib/fetchers/blinkit';
import { fetchZeptoPrice } from '@/lib/fetchers/zepto';
import { fetchSwiggyInstamartPrice } from '@/lib/fetchers/swiggy';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let platform = '';
    let fetcher = null;

    if (url.includes('blinkit.com')) {
      platform = 'blinkit';
      fetcher = fetchBlinkitPrice;
    } else if (url.includes('zeptonow.com') || url.includes('zepto.com')) {
      platform = 'zepto';
      fetcher = fetchZeptoPrice;
    } else if (url.includes('swiggy.com/instamart') || url.includes('swiggy.com')) {
      platform = 'swiggy';
      fetcher = fetchSwiggyInstamartPrice;
    } else {
      return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });
    }

    const data = await fetcher(url);

    if (!data.name || !data.price) {
      return NextResponse.json({ error: 'Could not extract product details' }, { status: 500 });
    }

    const { data: inserted, error } = await supabase
      .from('items')
      .insert([{
        url,
        platform,
        name: data.name,
        current_price: data.price,
        first_seen_price: data.price,
        in_stock: data.inStock
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Database insert failed' }, { status: 500 });
    }

    return NextResponse.json(inserted);
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
