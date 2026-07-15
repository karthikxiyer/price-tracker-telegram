import { chromium, BrowserContext } from 'playwright';

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-blink-features=AutomationControlled',
];

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function createContext(): Promise<{ browser: Awaited<ReturnType<typeof chromium.launch>>; context: BrowserContext }> {
  const browser = await chromium.launch({ headless: true, args: BROWSER_ARGS });
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    locale: 'en-IN',
    geolocation: { latitude: 12.96902, longitude: 77.75395 },
    permissions: ['geolocation'],
    extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' },
  });
  // Mask automation signals
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    (window as any).chrome = { runtime: {} };
  });
  return { browser, context };
}
