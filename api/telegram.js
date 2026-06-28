import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  // =========================
  // VALIDASI SESSION
  // =========================

  const cookie = req.headers.cookie || "";
  console.log("COOKIE:", cookie);
  const match = cookie.match(/session=([^;]+)/);
  console.log("MATCH:", match);

  if (!match) {
    return res.status(403).json({
      success: false,
      message: "MAU APA LU HAN? 🤨"
    });
  }

  const session = match[1];
  console.log("SESSION:", session);
  const parts = session.split(".");

  if (parts.length !== 3) {
    return res.status(403).json({
      success: false,
      message: "Session tidak valid"
    });
  }

  const [timestamp, nonce, signature] = parts;

  if (Date.now() - Number(timestamp) > 20000) {
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
    return res.status(403).json({
      success: false,
      message: "Session tidak valid"
    });
  }

  // =========================
  // CLOUDFARE TURNSTILE
  // =========================

  const { pesan, token } = req.body;

  if (!token) {
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
    return res.status(403).json({
      success: false,
      message: "Verifikasi Cloudflare gagal."
    });
  }

  // =========================
  // TELEGRAM
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
  // HAPUS COOKIE
  // =========================

  res.setHeader(
    "Set-Cookie",
    "session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"
  );

  return res.status(200).json({
    success: semuaBerhasil
  });
}
