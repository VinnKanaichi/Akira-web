export const config = { matcher: '/(.*)' };

const BAD_UA = /(axios|node-fetch|undici|curl|wget|python|okhttp|scrapy|httrack|java|go-http-client|libwww|aiohttp|httpx)/i;

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  const xrw = request.headers.get('x-requested-with') || '';

  if (!ua || BAD_UA.test(ua) || /^com\.web2apk\./i.test(xrw)) {
    return new Response('Akses ditolak proteksi by vinn.', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }
  // selain itu: lanjut normal (tidak return apa-apa)
}
