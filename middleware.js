export const config = { matcher: '/(.*)' };

// bot yang sah (preview link WA/Telegram, mesin pencari)
const GOOD_BOTS = /(whatsapp|telegrambot|facebookexternalhit|twitterbot|discordbot|googlebot|bingbot)/i;
const BAD_UA = /(axios|node-fetch|undici|curl|wget|python|okhttp|scrapy|httrack|java|go-http-client|libwww|aiohttp|httpx|headless|puppeteer|playwright)/i;

export default function middleware(request) {
  const h = request.headers;
  const ua = h.get('user-agent') || '';
  if (GOOD_BOTS.test(ua)) return;

  const xrw = h.get('x-requested-with') || '';          // WebView/APK wrapper mengirim ini
  const isWebView = /; wv\)/.test(ua) || xrw !== '';
  const notBrowser = !h.get('sec-fetch-mode') || !h.get('accept-language'); // browser asli selalu kirim

  if (!ua || BAD_UA.test(ua) || isWebView || notBrowser) {
    console.log('BLOCKED', JSON.stringify({
      ip: h.get('x-forwarded-for'), ua, xrw,
      sfm: h.get('sec-fetch-mode'), al: h.get('accept-language')
    }));
    return new Response('Akses ditolak.', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }
}
