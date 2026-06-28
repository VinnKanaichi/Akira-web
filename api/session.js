import crypto from "crypto";

export default function handler(req, res) {
  const timestamp = Date.now().toString();

  const signature = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(timestamp)
    .digest("hex");

  const value = `${timestamp}.${signature}`;

  res.setHeader(
    "Set-Cookie",
    `session=${value}; HttpOnly; Secure; SameSite=Strict; Path=/`
  );

  res.json({ success: true });
}
