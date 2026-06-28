import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  // Ambil cookie session
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/session=([^;]+)/);

  if (!match) {
    return res.status(403).json({
      success: false,
      message: "MAU APA LU HAN? 🤨"
    });
  }

  const session = match[1];
  const parts = session.split(".");

  if (parts.length !== 3) {
    return res.status(403).json({
      success: false,
      message: "Session tidak valid"
    });
  }

  const [timestamp, nonce, signature] = parts;

  // Cek umur session (20 detik)
  if (Date.now() - Number(timestamp) > 20000) {
    return res.status(403).json({
      success: false,
      message: "Session expired"
    });
  }

  // Verifikasi HMAC
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

  const BOT_TOKEN = process.env.BOT_TOKEN;

  const CHAT_IDS = [
    process.env.CHAT_ID_1,
    process.env.CHAT_ID_2
  ].filter(Boolean);

  const { pesan } = req.body;

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

      if (!response.ok) semuaBerhasil = false;
    } catch (err) {
      console.error(err);
      semuaBerhasil = false;
    }
  }

  // Hapus cookie setelah request
  res.setHeader(
    "Set-Cookie",
    "session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"
  );

  res.status(200).json({
    success: semuaBerhasil
  });
}
