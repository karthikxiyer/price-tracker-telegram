# Grocery Price Drop Alert System

A full-stack system that tracks prices for grocery items on Blinkit, Zepto, and Swiggy Instamart and sends a Telegram alert whenever a tracked item's price changes.

## Setup Instructions

### 1. Database Setup (Supabase)
1. Create a new Supabase project (free tier is sufficient).
2. Go to the SQL Editor and run the following schema to create the required tables:

```sql
create table items (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  platform text not null check (platform in ('blinkit', 'zepto', 'swiggy', 'amazon', 'flipkart', 'bigbasket')),
  name text,
  current_price numeric,
  last_price numeric,
  first_seen_price numeric,
  in_stock boolean default true,
  last_checked timestamptz default now(),
  created_at timestamptz default now()
);

create table price_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references items(id) on delete cascade,
  price numeric,
  checked_at timestamptz default now()
);
```
3. Copy your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (from Project Settings -> API) into your environment variables.

### 2. Telegram Bot Setup
1. Open Telegram and search for `@BotFather`.
2. Send `/newbot` and follow the instructions to create a bot. Note down the `TELEGRAM_BOT_TOKEN`.
3. Start a chat with your new bot and send a message.
4. Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` in your browser to find your `chat_id`.

### 3. Vercel Deployment (Webapp)
1. Deploy this Next.js app to Vercel (Hobby tier is fine).
2. Set the following Environment Variables in the Vercel dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `LOCATION_PINCODE` (optional, for platforms that need it)

### 4. GitHub Actions Setup (Cron Job)
1. In your GitHub repository, go to Settings -> Secrets and variables -> Actions.
2. Add the following Repository Secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `LOCATION_PINCODE` (optional)
3. The scheduled cron job will run every 30 minutes to check prices.

## Maintenance Note
**IMPORTANT:** The platform scraping logic (in `lib/fetchers/`) extracts pricing from the embedded JSON in the page HTML of Blinkit, Zepto, and Swiggy Instamart. These selectors and JSON paths **will break** when the sites update their frontend. The scraper code will require periodic maintenance to remain functional.
