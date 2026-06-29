import crypto from "crypto";
import { checkRateLimit } from "./ratelimit.js";

// =========================
// ALERT BOT SYSTEM
// =========================

const ALERT_BOT_TOKEN = process.env.ALERT_BOT_TOKEN;
const ALERT_CHAT_ID = process.env.CHAT_ID1;

// Fungsi deteksi script dari User-Agent
function detectRequestType(userAgent) {
  const scriptPatterns = [
    'curl', 'wget', 'python', 'java', 'node-fetch', 
    'axios', 'postman', 'insomnia', 'http-client',
    'go-http', 'ruby', 'perl', 'php', 'scrapy',
    'httpie', 'headless', 'phantomjs', 'selenium',
    'puppeteer', 'playwright', 'requests'
  ];

  const browserPatterns = [
    'chrome', 'firefox', 'safari', 'edge', 
    'opera', 'brave', 'vivaldi'
  ];

  const ua = userAgent.toLowerCase();
  
  for (const pattern of scriptPatterns) {
    if (ua.includes(pattern)) {
      return { type: 'script', tool: pattern };
    }
  }
  
  for (const pattern of browserPatterns) {
    if (ua.includes(pattern)) {
      return { type: 'browser', browser: pattern };
    }
  }
  
  return { type: 'unknown', tool: 'tidak dikenali' };
}

// Fungsi kirim alert ke Telegram
async function sendAlert(ip, userAgent, sessionStatus, turnstileStatus, req) {
  // Cek apakah ALERT_BOT_TOKEN ada
  if (!ALERT_BOT_TOKEN || !ALERT_CHAT_ID) {
    console.log('⚠️ Alert bot tidak dikonfigurasi');
    return;
  }

  const detection = detectRequestType(userAgent);
  const isScript = detection.type === 'script';
  
  const icon = isScript ? '🤖' : '👤';
  const typeLabel = isScript ? '🚨 SCRIPT DETEKSI!' : '📱 Pengunjung';
  const detail = isScript ? `Tool: ${detection.tool}` : `Browser: ${detection.browser}`;
  
  const method = req.method || 'UNKNOWN';
  const path = req.url || '/';
  
  const message = `
${icon} **${typeLabel}**
📅 Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
🌐 IP: \`${ip}\`
🛠️ ${detail}
🔗 ${method} ${path}
🔐 Session: ${sessionStatus ? '✅ Valid' : '❌ Tidak Valid'}
🛡️ Turnstile: ${turnstileStatus ? '✅ Lolos' : '❌ Gagal'}
  `;

  try {
    await fetch(`https://api.telegram.org/bot${ALERT_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ALERT_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });
  } catch (err) {
    console.error('Gagal kirim alert:', err.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  const ip =
  (req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();

  const total = await checkRateLimit(ip);

if (total > 2) {
  return res.status(429).json({
    success: false,
    message: "Terlalu banyak permintaan. Coba lagi dalam 5 jam."
  });
}
  // =========================
  // VALIDASI SESSION
  // =========================

  const cookie = req.headers.cookie || "";
  const match = cookie.match(/session=([^;]+)/);

  if (!match) {
    return res.status(403).json({
      success: false,
      message: "MAU APA LU HAN? 🤨"
export default async function handler(req, res) {
  // =========================
  // 1. AMBIL DATA REQUEST (UNTUK ALERT)
  // =========================
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
             req.connection.remoteAddress || 
             'IP tidak diketahui';
  const userAgent = req.headers['user-agent'] || 'Tidak diketahui';

  // =========================
  // 2. METHOD CHECK
  // =========================
  if (req.method !== "POST") {
    await sendAlert(ip, userAgent, false, false, req);
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  // =========================
  // 3. RATE LIMITING
  // =========================
  const total = await checkRateLimit(ip);

  if (total > 2) {
    await sendAlert(ip, userAgent, false, false, req);
    return res.status(429).json({
      success: false,
      message: "Terlalu banyak permintaan. Coba lagi dalam 5 jam."
    });
  }

  // =========================
  // 4. VALIDASI SESSION
  // =========================
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/session=([^;]+)/);

  if (!match) {
    await sendAlert(ip, userAgent, false, false, req);
    return res.status(403).json({
      success: false,
      message: "MAU APA LU HAN? 🤨"
    });
  }

  const session = match[1];
  const parts = session.split(".");

  if (parts.length !== 3) {
    await sendAlert(ip, userAgent, false, false, req);
    return res.status(403).json({
      success: false,
      message: "Session tidak valid"
    });
  }

  const [timestamp, nonce, signature] = parts;

  if (Date.now() - Number(timestamp) > 20000) {
    await sendAlert(ip, userAgent, false, false, req);
    return res.status(403).json({
      success: false,
      message: "Session expired"
    });
  }

  const payload = `${timestamp}.${nonce}`;

  const expected = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(payload)
    .digest("hex");

  if (signature !== expected) {
    await sendAlert(ip, userAgent, false, false, req);
    return res.status(403).json({
      success: false,
      message: "Session tidak valid"
    });
  }

  const sessionValid = true;

  // =========================
  // 5. CLOUDFARE TURNSTILE
  // =========================
  const { pesan, token } = req.body;

  if (!token) {
    await sendAlert(ip, userAgent, sessionValid, false, req);
    return res.status(403).json({
      success: false,
      message: "Token Turnstile tidak ditemukan."
    });
  }

  const verify = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET,
        response: token
      })
    }
  );

  const result = await verify.json();

  if (!result.success) {
    await sendAlert(ip, userAgent, sessionValid, false, req);
    return res.status(403).json({
      success: false,
      message: "Verifikasi Cloudflare gagal."
    });
  }

  const turnstileValid = true;

  // =========================
  // 6. TELEGRAM
  // =========================
  const BOT_TOKEN = process.env.BOT_TOKEN;

  const CHAT_IDS = [
    process.env.CHAT_ID_1,
    process.env.CHAT_ID_2
  ].filter(Boolean);

  let semuaBerhasil = true;

  for (const id of CHAT_IDS) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chat_id: id,
            text: pesan,
            parse_mode: "Markdown"
          })
        }
      );

      if (!response.ok) {
        semuaBerhasil = false;
      }
    } catch (err) {
      console.error(err);
      semuaBerhasil = false;
    }
  }

  // =========================
  // 7. KIRIM ALERT SUKSES
  // =========================
  await sendAlert(ip, userAgent, sessionValid, turnstileValid, req);

  // =========================
  // 8. HAPUS COOKIE
  // =========================
  res.setHeader(
    "Set-Cookie",
    "session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"
  );

  return res.status(200).json({
    success: semuaBerhasil
  });
  }
