export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
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

  res.status(200).json({
    success: semuaBerhasil
  });
}
