import crypto from "crypto";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false
    });
  }

  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();

  const payload = `${timestamp}.${nonce}`;

  const signature = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(payload)
    .digest("hex");

  const value = `${payload}.${signature}`;

  res.setHeader(
    "Set-Cookie",
    `session=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=20`
  );

  res.json({
    success: true
  });
}
